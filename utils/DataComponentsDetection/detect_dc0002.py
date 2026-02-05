"""
MITRE ATT&CK ICS - User Account Authentication (DC0002) Detection System
Author: Industrial Security AI Team
Description: Anomaly detection system for authentication events in ICS/OT environments
"""

import os
import sys
import json
import time
import logging
import asyncio
import signal
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, Counter
import statistics

# Third-party imports
from elasticsearch import AsyncElasticsearch, NotFoundError
from elasticsearch.helpers import async_scan
import numpy as np
from pydantic import BaseModel, Field, validator
import redis.asyncio as redis
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/ics_auth_detector.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ICS-Auth-Detector")

# ============================================================================
# DATA MODELS
# ============================================================================

class MITRETechnique(BaseModel):
    """MITRE ATT&CK for ICS Technique model"""
    technique_id: str
    name: str
    description: str
    tactics: List[str]

class DetectionRule(BaseModel):
    """Detection rule for authentication anomalies"""
    rule_id: str
    name: str
    description: str
    mitre_techniques: List[str] = Field(default_factory=list)
    log_sources: List[str] = Field(default_factory=list)
    severity: str = Field("MEDIUM", regex="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    threshold: Optional[float] = None
    window_minutes: int = Field(15, gt=0)
    
class Alert(BaseModel):
    """Security alert model"""
    alert_id: str
    timestamp: datetime
    rule_id: str
    severity: str
    confidence: float
    description: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    username: Optional[str] = None
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    raw_event: Dict[str, Any] = Field(default_factory=dict)
    mitre_techniques: List[str] = Field(default_factory=list)
    detection_component: str = "DC0002"
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

@dataclass
class AuthEvent:
    """Normalized authentication event"""
    timestamp: datetime
    event_type: str  # "SUCCESS", "FAILURE", "ATTEMPT"
    username: str
    source_ip: str
    destination_ip: Optional[str] = None
    service: Optional[str] = None  # ssh, sudo, http, etc.
    method: Optional[str] = None  # password, key, token
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None  # PLC, HMI, EWS, Router
    raw_message: Optional[str] = None
    is_admin: bool = False
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "username": self.username,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "service": self.service,
            "method": self.method,
            "asset_name": self.asset_name,
            "asset_type": self.asset_type,
            "is_admin": self.is_admin,
            "session_id": self.session_id
        }

class AssetType(Enum):
    """Industrial asset types"""
    PLC = "PLC"
    HMI = "HMI"
    EWS = "ENGINEERING_WORKSTATION"
    ROUTER = "ROUTER"
    FIREWALL = "FIREWALL"
    SCADA_SERVER = "SCADA_SERVER"
    HISTORIAN = "HISTORIAN"
    UNKNOWN = "UNKNOWN"

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Application configuration"""
    # Elasticsearch
    ES_HOST = os.getenv("ES_HOST", "localhost")
    ES_PORT = int(os.getenv("ES_PORT", "9200"))
    ES_USER = os.getenv("ES_USER", "")
    ES_PASSWORD = os.getenv("ES_PASSWORD", "")
    ES_INDEX_PATTERN = os.getenv("ES_INDEX_PATTERN", "logs-*")
    ES_SSL_VERIFY = os.getenv("ES_SSL_VERIFY", "false").lower() == "true"
    
    # Redis for state management
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    
    # Detection parameters
    DETECTION_INTERVAL_SECONDS = int(os.getenv("DETECTION_INTERVAL_SECONDS", "60"))
    LOOKBACK_MINUTES = int(os.getenv("LOOKBACK_MINUTES", "60"))
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "1000"))
    
    # Thresholds for anomaly detection
    FAILED_LOGIN_THRESHOLD = int(os.getenv("FAILED_LOGIN_THRESHOLD", "5"))
    FAILED_LOGIN_WINDOW_MINUTES = int(os.getenv("FAILED_LOGIN_WINDOW_MINUTES", "10"))
    NEW_USER_THRESHOLD_HOURS = int(os.getenv("NEW_USER_THRESHOLD_HOURS", "24"))
    
    # Whitelists (would be loaded from external config in production)
    WHITELISTED_IPS = ["192.168.95.1", "192.168.90.1"]  # Gateway IPs
    WHITELISTED_USERS = ["admin", "operator", "engineer"]
    ASSET_NETWORKS = {
        "192.168.95.0/24": "ICS_NETWORK",
        "192.168.90.0/24": "DMZ_NETWORK"
    }
    
    # Asset mapping from docker-compose
    ASSET_MAPPING = {
        "192.168.95.2": {"name": "PLC", "type": AssetType.PLC},
        "192.168.95.5": {"name": "EWS", "type": AssetType.EWS},
        "192.168.90.107": {"name": "HMI", "type": AssetType.HMI},
        "192.168.95.200": {"name": "ROUTER", "type": AssetType.ROUTER},
        "192.168.90.200": {"name": "ROUTER_DMZ", "type": AssetType.ROUTER},
        "192.168.90.6": {"name": "KALI_ATTACKER", "type": AssetType.UNKNOWN},
        "192.168.95.10": {"name": "SIMULATION", "type": AssetType.SCADA_SERVER}
    }

# ============================================================================
# ELASTICSEARCH CLIENT
# ============================================================================

class ElasticsearchClient:
    """Async Elasticsearch client with connection management"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = None
        self._connected = False
        
    async def connect(self):
        """Establish connection to Elasticsearch"""
        try:
            hosts = [f"{self.config.ES_HOST}:{self.config.ES_PORT}"]
            
            if self.config.ES_USER and self.config.ES_PASSWORD:
                self.client = AsyncElasticsearch(
                    hosts=hosts,
                    http_auth=(self.config.ES_USER, self.config.ES_PASSWORD),
                    verify_certs=self.config.ES_SSL_VERIFY,
                    max_retries=3,
                    retry_on_timeout=True
                )
            else:
                self.client = AsyncElasticsearch(
                    hosts=hosts,
                    verify_certs=self.config.ES_SSL_VERIFY
                )
            
            # Test connection
            info = await self.client.info()
            logger.info(f"Connected to Elasticsearch cluster: {info['cluster_name']}")
            self._connected = True
            
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            raise
    
    async def disconnect(self):
        """Close Elasticsearch connection"""
        if self.client:
            await self.client.close()
            self._connected = False
            logger.info("Disconnected from Elasticsearch")
    
    @asynccontextmanager
    async def get_client(self):
        """Context manager for Elasticsearch client"""
        if not self._connected:
            await self.connect()
        try:
            yield self.client
        finally:
            # We don't disconnect here to maintain connection pool
            pass
    
    async def search_auth_events(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """Search for authentication events in Elasticsearch"""
        query = {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": start_time.isoformat(),
                                "lte": end_time.isoformat(),
                                "format": "strict_date_optional_time"
                            }
                        }
                    },
                    {
                        "bool": {
                            "should": [
                                # Linux auth logs
                                {"match": {"message": "sshd"}},
                                {"match": {"message": "Failed password"}},
                                {"match": {"message": "authentication failure"}},
                                {"match": {"message": "Accepted password"}},
                                {"match": {"message": "sudo"}},
                                # Network device logs
                                {"match": {"message": "AAA"}},
                                {"match": {"message": "TACACS"}},
                                {"match": {"message": "login failed"}},
                                # Windows-like events in ICS
                                {"match": {"message": "EventCode=4625"}},
                                {"match": {"message": "EventCode=4624"}},
                                # Container logs
                                {"exists": {"field": "auth"}},
                                {"exists": {"field": "user"}}
                            ],
                            "minimum_should_match": 1
                        }
                    }
                ]
            }
        }
        
        events = []
        try:
            async with self.get_client() as es:
                # Use scan for large result sets
                async for hit in async_scan(
                    es,
                    index=self.config.ES_INDEX_PATTERN,
                    query={"query": query},
                    size=self.config.BATCH_SIZE,
                    preserve_order=False
                ):
                    events.append(hit["_source"])
                    
        except Exception as e:
            logger.error(f"Error searching auth events: {e}")
        
        return events

# ============================================================================
# LOG PARSERS
# ============================================================================

class AuthLogParser:
    """Parse various authentication log formats"""
    
    @staticmethod
    def parse_linux_auth(log_entry: Dict) -> Optional[AuthEvent]:
        """Parse Linux /var/log/auth.log entries"""
        message = log_entry.get("message", "")
        timestamp = log_entry.get("@timestamp")
        
        if not timestamp or not message:
            return None
        
        # Convert timestamp string to datetime
        if isinstance(timestamp, str):
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except:
                dt = datetime.utcnow()
        else:
            dt = datetime.utcnow()
        
        # Parse common patterns
        event_type = "ATTEMPT"
        username = "unknown"
        source_ip = "unknown"
        service = "unknown"
        method = "password"
        
        # SSH failed password
        if "Failed password" in message:
            event_type = "FAILURE"
            # Extract username and IP
            parts = message.split()
            for i, part in enumerate(parts):
                if part == "for":
                    if i + 1 < len(parts):
                        username = parts[i + 1]
                elif part == "from":
                    if i + 1 < len(parts):
                        source_ip = parts[i + 1]
        
        # SSH accepted password
        elif "Accepted password" in message:
            event_type = "SUCCESS"
            parts = message.split()
            for i, part in enumerate(parts):
                if part == "for":
                    if i + 1 < len(parts):
                        username = parts[i + 1]
                elif part == "from":
                    if i + 1 < len(parts):
                        source_ip = parts[i + 1]
        
        # sudo commands
        elif "sudo:" in message and "COMMAND" in message:
            event_type = "SUCCESS"
            parts = message.split()
            for i, part in enumerate(parts):
                if part == "USER=":
                    if i + 1 < len(parts):
                        username = parts[i + 1]
        
        # Invalid user attempts
        elif "Invalid user" in message:
            event_type = "FAILURE"
            parts = message.split()
            for i, part in enumerate(parts):
                if part == "user":
                    if i + 1 < len(parts):
                        username = parts[i + 1]
                elif part == "from":
                    if i + 1 < len(parts):
                        source_ip = parts[i + 1]
        
        # Check for admin privileges
        is_admin = "sudo" in message.lower() or username in ["root", "admin"]
        
        return AuthEvent(
            timestamp=dt,
            event_type=event_type,
            username=username,
            source_ip=source_ip,
            service="ssh" if "sshd" in message else "sudo" if "sudo" in message else "system",
            method=method,
            asset_name=log_entry.get("host", {}).get("name", "unknown"),
            asset_type=AssetType.EWS.value if "ews" in log_entry.get("host", {}).get("name", "").lower() else AssetType.UNKNOWN.value,
            raw_message=message,
            is_admin=is_admin,
            session_id=hashlib.md5(f"{username}{source_ip}{dt}".encode()).hexdigest()[:16]
        )
    
    @staticmethod
    def parse_network_device(log_entry: Dict) -> Optional[AuthEvent]:
        """Parse network device authentication logs"""
        message = log_entry.get("message", "")
        if not any(term in message.lower() for term in ["login", "aaa", "tacacs", "authentication"]):
            return None
        
        # Simplified parsing - would be enhanced with regex patterns
        event_type = "ATTEMPT"
        if "failed" in message.lower():
            event_type = "FAILURE"
        elif "success" in message.lower() or "logged in" in message.lower():
            event_type = "SUCCESS"
        
        # Extract IP from common patterns
        source_ip = "unknown"
        for part in message.split():
            if part.count('.') == 3 and all(octet.isdigit() for octet in part.split('.')):
                source_ip = part
                break
        
        return AuthEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type,
            username="network_user",
            source_ip=source_ip,
            service="network",
            method="aaa",
            asset_name="router",
            asset_type=AssetType.ROUTER.value,
            raw_message=message,
            is_admin="privileged" in message.lower() or "level 15" in message
        )
    
    @staticmethod
    def parse_generic(log_entry: Dict) -> Optional[AuthEvent]:
        """Parse generic authentication events"""
        # Extract from ECS (Elastic Common Schema) fields if available
        if "user" in log_entry and "source" in log_entry:
            user = log_entry.get("user", {})
            source = log_entry.get("source", {})
            event = log_entry.get("event", {})
            
            username = user.get("name", "unknown")
            source_ip = source.get("ip", "unknown")
            event_type = "SUCCESS" if event.get("outcome") == "success" else "FAILURE"
            
            return AuthEvent(
                timestamp=datetime.utcnow(),
                event_type=event_type,
                username=username,
                source_ip=source_ip,
                service=event.get("module", "unknown"),
                method=event.get("type", "unknown"),
                asset_name=log_entry.get("host", {}).get("name", "unknown"),
                raw_message=str(log_entry)
            )
        
        return None

# ============================================================================
# DETECTION ENGINE
# ============================================================================

class AnomalyDetector:
    """Detect authentication anomalies based on MITRE ATT&CK patterns"""
    
    def __init__(self, config: Config):
        self.config = config
        self.baseline = {}
        self.redis_client = None
        
    async def initialize_redis(self):
        """Initialize Redis connection for state management"""
        try:
            self.redis_client = redis.Redis(
                host=self.config.REDIS_HOST,
                port=self.config.REDIS_PORT,
                db=self.config.REDIS_DB,
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    async def detect_anomalies(self, auth_events: List[AuthEvent]) -> List[Alert]:
        """Run all detection rules on authentication events"""
        alerts = []
        
        # Group events for analysis
        events_by_source = defaultdict(list)
        events_by_user = defaultdict(list)
        events_by_asset = defaultdict(list)
        
        for event in auth_events:
            events_by_source[event.source_ip].append(event)
            events_by_user[event.username].append(event)
            events_by_asset[event.asset_name].append(event)
        
        # Run detection rules
        alerts.extend(await self.detect_brute_force(events_by_source))
        alerts.extend(await self.detect_credential_stuffing(events_by_user))
        alerts.extend(await self.detect_lateral_movement(events_by_source))
        alerts.extend(await self.detect_privilege_escalation(auth_events))
        alerts.extend(await self.detect_impossible_travel(auth_events))
        alerts.extend(await self.detect_new_user_anomalies(events_by_user))
        alerts.extend(await self.detect_out_of_hours_access(auth_events))
        
        return alerts
    
    async def detect_brute_force(self, events_by_source: Dict) -> List[Alert]:
        """Detect brute force attacks (T0859 - Valid Accounts)"""
        alerts = []
        
        for source_ip, events in events_by_source.items():
            if source_ip in self.config.WHITELISTED_IPS:
                continue
            
            # Count failed attempts in time window
            window_start = datetime.utcnow() - timedelta(minutes=self.config.FAILED_LOGIN_WINDOW_MINUTES)
            failed_attempts = [e for e in events if e.event_type == "FAILURE" and e.timestamp > window_start]
            
            if len(failed_attempts) >= self.config.FAILED_LOGIN_THRESHOLD:
                # Calculate confidence based on attempt count
                confidence = min(0.3 + (len(failed_attempts) / 20), 0.9)
                
                alert = Alert(
                    alert_id=f"brute_force_{hashlib.md5(f'{source_ip}{datetime.utcnow()}'.encode()).hexdigest()[:8]}",
                    timestamp=datetime.utcnow(),
                    rule_id="RULE-001",
                    severity="HIGH",
                    confidence=confidence,
                    description=f"Brute force attack detected from {source_ip}. {len(failed_attempts)} failed attempts in {self.config.FAILED_LOGIN_WINDOW_MINUTES} minutes.",
                    source_ip=source_ip,
                    mitre_techniques=["T0859", "T0801"],
                    raw_event={
                        "source_ip": source_ip,
                        "failed_attempts": len(failed_attempts),
                        "usernames_attempted": list(set([e.username for e in failed_attempts]))
                    }
                )
                alerts.append(alert)
                
                # Store in Redis for correlation
                if self.redis_client:
                    key = f"brute_force:{source_ip}"
                    await self.redis_client.setex(key, 3600, str(len(failed_attempts)))
        
        return alerts
    
    async def detect_credential_stuffing(self, events_by_user: Dict) -> List[Alert]:
        """Detect credential stuffing attacks"""
        alerts = []
        
        for username, events in events_by_user.items():
            if username in self.config.WHITELISTED_USERS:
                continue
            
            # Look for failed attempts followed by success
            events_sorted = sorted(events, key=lambda x: x.timestamp)
            
            for i in range(len(events_sorted) - 1):
                current = events_sorted[i]
                next_event = events_sorted[i + 1]
                
                if (current.event_type == "FAILURE" and 
                    next_event.event_type == "SUCCESS" and
                    current.username == next_event.username and
                    current.source_ip == next_event.source_ip and
                    (next_event.timestamp - current.timestamp).total_seconds() < 300):  # 5 minutes
                    
                    alert = Alert(
                        alert_id=f"cred_stuff_{hashlib.md5(f'{username}{current.timestamp}'.encode()).hexdigest()[:8]}",
                        timestamp=datetime.utcnow(),
                        rule_id="RULE-002",
                        severity="MEDIUM",
                        confidence=0.7,
                        description=f"Possible credential stuffing for user {username}. Failed attempt followed by success from same IP.",
                        source_ip=current.source_ip,
                        username=username,
                        mitre_techniques=["T0859"],
                        raw_event={
                            "username": username,
                            "source_ip": current.source_ip,
                            "failure_time": current.timestamp.isoformat(),
                            "success_time": next_event.timestamp.isoformat()
                        }
                    )
                    alerts.append(alert)
                    break
        
        return alerts
    
    async def detect_lateral_movement(self, events_by_source: Dict) -> List[Alert]:
        """Detect lateral movement within the ICS network"""
        alerts = []
        
        for source_ip, events in events_by_source.items():
            # Check if source IP is accessing multiple assets
            assets_accessed = set([e.asset_name for e in events if e.asset_name != "unknown"])
            
            if len(assets_accessed) > 3:  # Threshold for lateral movement
                # Check if this is normal behavior (baselining)
                if await self.is_normal_behavior(source_ip, assets_accessed):
                    continue
                
                alert = Alert(
                    alert_id=f"lateral_{hashlib.md5(f'{source_ip}{datetime.utcnow()}'.encode()).hexdigest()[:8]}",
                    timestamp=datetime.utcnow(),
                    rule_id="RULE-003",
                    severity="HIGH",
                    confidence=0.6,
                    description=f"Possible lateral movement detected. IP {source_ip} accessed {len(assets_accessed)} different assets.",
                    source_ip=source_ip,
                    mitre_techniques=["T0801", "T0812"],
                    raw_event={
                        "source_ip": source_ip,
                        "assets_accessed": list(assets_accessed),
                        "access_count": len(events)
                    }
                )
                alerts.append(alert)
        
        return alerts
    
    async def detect_privilege_escalation(self, events: List[AuthEvent]) -> List[Alert]:
        """Detect privilege escalation attempts"""
        alerts = []
        
        for event in events:
            if event.is_admin and event.username not in self.config.WHITELISTED_USERS:
                # Non-standard user performing admin actions
                alert = Alert(
                    alert_id=f"priv_esc_{hashlib.md5(f'{event.username}{event.timestamp}'.encode()).hexdigest()[:8]}",
                    timestamp=datetime.utcnow(),
                    rule_id="RULE-004",
                    severity="CRITICAL",
                    confidence=0.8,
                    description=f"Privilege escalation detected. User {event.username} performed admin action on {event.asset_name}.",
                    source_ip=event.source_ip,
                    username=event.username,
                    asset_name=event.asset_name,
                    asset_type=event.asset_type,
                    mitre_techniques=["T0803", "T0855"],
                    raw_event=event.to_dict()
                )
                alerts.append(alert)
        
        return alerts
    
    async def detect_impossible_travel(self, events: List[AuthEvent]) -> List[Alert]:
        """Detect impossible travel (same user from geographically distant locations)"""
        # This would require IP geolocation database in production
        # Simplified version: detect same user from different network segments
        
        user_locations = defaultdict(set)
        
        for event in events:
            user_locations[event.username].add(self.get_network_segment(event.source_ip))
        
        alerts = []
        for username, segments in user_locations.items():
            if len(segments) > 1 and username not in self.config.WHITELISTED_USERS:
                alert = Alert(
                    alert_id=f"travel_{hashlib.md5(f'{username}{datetime.utcnow()}'.encode()).hexdigest()[:8]}",
                    timestamp=datetime.utcnow(),
                    rule_id="RULE-005",
                    severity="MEDIUM",
                    confidence=0.5,
                    description=f"Impossible travel detected for user {username}. Accessed from {len(segments)} different network segments.",
                    username=username,
                    mitre_techniques=["T0859"],
                    raw_event={
                        "username": username,
                        "segments": list(segments)
                    }
                )
                alerts.append(alert)
        
        return alerts
    
    async def detect_new_user_anomalies(self, events_by_user: Dict) -> List[Alert]:
        """Detect anomalies with newly created/observed users"""
        alerts = []
        
        for username, events in events_by_user.items():
            if username in ["unknown", "root", "admin"]:
                continue
            
            # Check if this is a new user
            if await self.is_new_user(username):
                # Look for suspicious patterns with new user
                failed_count = len([e for e in events if e.event_type == "FAILURE"])
                success_count = len([e for e in events if e.event_type == "SUCCESS"])
                
                if failed_count > 0 and success_count > 0:
                    alert = Alert(
                        alert_id=f"new_user_{hashlib.md5(f'{username}{datetime.utcnow()}'.encode()).hexdigest()[:8]}",
                        timestamp=datetime.utcnow(),
                        rule_id="RULE-006",
                        severity="HIGH",
                        confidence=0.7,
                        description=f"Suspicious activity with new user {username}. Both failures and successes observed.",
                        username=username,
                        mitre_techniques=["T0859", "T0875"],
                        raw_event={
                            "username": username,
                            "failed_attempts": failed_count,
                            "successful_logins": success_count,
                            "first_seen": min(e.timestamp for e in events).isoformat()
                        }
                    )
                    alerts.append(alert)
        
        return alerts
    
    async def detect_out_of_hours_access(self, events: List[AuthEvent]) -> List[Alert]:
        """Detect authentication during non-business hours"""
        alerts = []
        
        for event in events:
            hour = event.timestamp.hour
            
            # ICS environments often have 24/7 operations, but certain users should have predictable schedules
            if hour < 6 or hour > 22:  # Between 10 PM and 6 AM
                if event.username not in self.config.WHITELISTED_USERS:
                    alert = Alert(
                        alert_id=f"ooh_{hashlib.md5(f'{event.username}{event.timestamp}'.encode()).hexdigest()[:8]}",
                        timestamp=datetime.utcnow(),
                        rule_id="RULE-007",
                        severity="MEDIUM",
                        confidence=0.4,
                        description=f"Out-of-hours authentication for user {event.username} at {event.timestamp.strftime('%H:%M')}.",
                        source_ip=event.source_ip,
                        username=event.username,
                        asset_name=event.asset_name,
                        mitre_techniques=["T0859"],
                        raw_event=event.to_dict()
                    )
                    alerts.append(alert)
        
        return alerts
    
    def get_network_segment(self, ip: str) -> str:
        """Determine network segment from IP address"""
        for network, segment in self.config.ASSET_NETWORKS.items():
            if self.ip_in_network(ip, network):
                return segment
        return "UNKNOWN"
    
    def ip_in_network(self, ip: str, network: str) -> bool:
        """Check if IP is in network CIDR"""
        # Simplified implementation
        if "/" not in network:
            return ip == network
        
        network_ip, mask = network.split("/")
        mask = int(mask)
        
        # Convert IPs to integers
        ip_int = self.ip_to_int(ip)
        network_int = self.ip_to_int(network_ip)
        
        # Create mask
        mask_int = (0xFFFFFFFF << (32 - mask)) & 0xFFFFFFFF
        
        return (ip_int & mask_int) == (network_int & mask_int)
    
    def ip_to_int(self, ip: str) -> int:
        """Convert IP address to integer"""
        octets = ip.split(".")
        return (int(octets[0]) << 24) + (int(octets[1]) << 16) + (int(octets[2]) << 8) + int(octets[3])
    
    async def is_normal_behavior(self, source_ip: str, assets_accessed: set) -> bool:
        """Check if behavior is normal based on baseline"""
        if not self.redis_client:
            return False
        
        key = f"baseline:{source_ip}"
        baseline_data = await self.redis_client.get(key)
        
        if baseline_data:
            baseline_assets = set(baseline_data.split(","))
            # If current behavior is similar to baseline
            similarity = len(assets_accessed.intersection(baseline_assets)) / len(baseline_assets.union(assets_accessed))
            return similarity > 0.7
        
        # Update baseline
        await self.redis_client.setex(key, 86400, ",".join(assets_accessed))
        return False
    
    async def is_new_user(self, username: str) -> bool:
        """Check if user was first seen recently"""
        if not self.redis_client:
            return True
        
        key = f"user_first_seen:{username}"
        first_seen = await self.redis_client.get(key)
        
        if not first_seen:
            await self.redis_client.setex(key, 86400 * 30, datetime.utcnow().isoformat())  # Store for 30 days
            return True
        
        first_seen_dt = datetime.fromisoformat(first_seen)
        age_hours = (datetime.utcnow() - first_seen_dt).total_seconds() / 3600
        
        return age_hours < self.config.NEW_USER_THRESHOLD_HOURS

# ============================================================================
# ALERT MANAGER
# ============================================================================

class AlertManager:
    """Manage and output alerts"""
    
    def __init__(self):
        self.alerts_sent = set()  # Track sent alerts to avoid duplicates
        
    async def send_alert(self, alert: Alert):
        """Send alert to various outputs"""
        alert_dict = alert.dict()
        
        # Avoid duplicates
        alert_hash = hashlib.md5(json.dumps(alert_dict, sort_keys=True).encode()).hexdigest()
        if alert_hash in self.alerts_sent:
            return
        
        self.alerts_sent.add(alert_hash)
        
        # Output to console
        logger.warning(f"ALERT: {alert.severity} - {alert.description}")
        logger.info(f"Alert details: {json.dumps(alert_dict, indent=2)}")
        
        # In production, would also send to:
        # - SIEM (via syslog or API)
        # - Email/Slack notifications
        # - Ticketing system
        # - Dashboard
        
        # Store in Elasticsearch
        await self.store_alert_in_es(alert)
        
        # Limit alert history to prevent memory issues
        if len(self.alerts_sent) > 10000:
            self.alerts_sent.clear()
    
    async def store_alert_in_es(self, alert: Alert):
        """Store alert in Elasticsearch for historical analysis"""
        try:
            es = AsyncElasticsearch([f"{Config.ES_HOST}:{Config.ES_PORT}"])
            
            index_name = f"ics-alerts-{datetime.utcnow().strftime('%Y.%m.%d')}"
            
            await es.index(
                index=index_name,
                document=alert.dict(),
                refresh=True
            )
            
            logger.debug(f"Alert stored in Elasticsearch index: {index_name}")
            
        except Exception as e:
            logger.error(f"Failed to store alert in Elasticsearch: {e}")
        finally:
            if 'es' in locals():
                await es.close()

# ============================================================================
# MAIN APPLICATION
# ============================================================================

class ICSAuthDetector:
    """Main application class"""
    
    def __init__(self):
        self.config = Config()
        self.es_client = ElasticsearchClient(self.config)
        self.detector = AnomalyDetector(self.config)
        self.alert_manager = AlertManager()
        self.parser = AuthLogParser()
        self.running = False
        
    async def initialize(self):
        """Initialize all components"""
        logger.info("Initializing ICS Authentication Detector...")
        
        # Connect to Elasticsearch
        await self.es_client.connect()
        
        # Initialize Redis for detector
        await self.detector.initialize_redis()
        
        logger.info("Initialization complete")
    
    async def run_detection_cycle(self):
        """Run a single detection cycle"""
        logger.info("Starting detection cycle...")
        
        try:
            # Calculate time window
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(minutes=self.config.LOOKBACK_MINUTES)
            
            # Fetch authentication events
            raw_events = await self.es_client.search_auth_events(start_time, end_time)
            logger.info(f"Fetched {len(raw_events)} authentication events")
            
            # Parse events
            auth_events = []
            for raw_event in raw_events:
                parsed = self.parser.parse_linux_auth(raw_event)
                if parsed:
                    auth_events.append(parsed)
                    continue
                    
                parsed = self.parser.parse_network_device(raw_event)
                if parsed:
                    auth_events.append(parsed)
                    continue
                    
                parsed = self.parser.parse_generic(raw_event)
                if parsed:
                    auth_events.append(parsed)
            
            logger.info(f"Parsed {len(auth_events)} authentication events")
            
            if auth_events:
                # Detect anomalies
                alerts = await self.detector.detect_anomalies(auth_events)
                
                # Process alerts
                for alert in alerts:
                    await self.alert_manager.send_alert(alert)
                
                logger.info(f"Generated {len(alerts)} alerts")
            
            # Log statistics
            await self.log_statistics(auth_events)
            
        except Exception as e:
            logger.error(f"Error in detection cycle: {e}", exc_info=True)
    
    async def log_statistics(self, events: List[AuthEvent]):
        """Log detection statistics"""
        if not events:
            return
        
        success_count = len([e for e in events if e.event_type == "SUCCESS"])
        failure_count = len([e for e in events if e.event_type == "FAILURE"])
        attempt_count = len([e for e in events if e.event_type == "ATTEMPT"])
        
        unique_users = len(set(e.username for e in events))
        unique_ips = len(set(e.source_ip for e in events))
        
        logger.info(
            f"Statistics - Success: {success_count}, Failure: {failure_count}, "
            f"Attempt: {attempt_count}, Unique Users: {unique_users}, "
            f"Unique IPs: {unique_ips}"
        )
    
    async def run_continuously(self):
        """Run detection continuously"""
        self.running = True
        
        # Handle graceful shutdown
        def signal_handler(sig, frame):
            logger.info("Received shutdown signal")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        logger.info("Starting continuous detection...")
        
        while self.running:
            cycle_start = time.time()
            
            try:
                await self.run_detection_cycle()
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {e}", exc_info=True)
            
            # Calculate sleep time
            cycle_duration = time.time() - cycle_start
            sleep_time = max(0, self.config.DETECTION_INTERVAL_SECONDS - cycle_duration)
            
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
        
        await self.shutdown()
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down...")
        
        await self.es_client.disconnect()
        
        if self.detector.redis_client:
            await self.detector.redis_client.close()
        
        logger.info("Shutdown complete")

# ============================================================================
# ENTRY POINT
# ============================================================================

async def main():
    """Main entry point"""
    detector = ICSAuthDetector()
    
    try:
        await detector.initialize()
        await detector.run_continuously()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())