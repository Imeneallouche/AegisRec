"""
MITRE ATT&CK ICS DataComponent Detection Module
Author: Security Analytics Team
Version: 1.0.0
"""

import os
import json
import re
import hashlib
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

from dotenv import load_dotenv
load_dotenv()

# Elasticsearch client
from elasticsearch import Elasticsearch, AsyncElasticsearch
from elasticsearch.helpers import async_scan, scan
# from elasticsearch.exceptions import ElasticsearchException

# embedding-based similarity
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
EMBEDDING_AVAILABLE = True

#except ImportError:
#    EMBEDDING_AVAILABLE = False
#    logging.warning("scikit-learn not available. Embedding-based similarity disabled.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# ENUMERATIONS AND DATA CLASSES
# ============================================================================

class MatchStrategy(Enum):
    """Matching strategy types"""
    EXACT = "exact"
    REGEX = "regex"
    TOKEN_OVERLAP = "token_overlap"
    COSINE_SIMILARITY = "cosine_similarity"
    FUZZY = "fuzzy"
    FIELD_EXISTS = "field_exists"

class PlatformType(Enum):
    """Platform types"""
    WINDOWS = "windows"
    LINUX = "linux"
    MACOS = "macos"
    ESXI = "esxi"
    KUBERNETES = "kubernetes"
    CONTAINER = "container"
    NETWORK = "network"
    CLOUD = "cloud"
    SAAS = "saas"
    FIRMWARE = "firmware"
    GENERIC = "generic"

class LogSourceType(Enum):
    """Log source types"""
    EVENT_LOG = "event_log"
    SYSLOG = "syslog"
    AUDIT = "audit"
    APPLICATION = "application"
    ENDPOINT = "endpoint"
    NETWORK = "network"
    CLOUD = "cloud"
    FIRMWARE = "firmware"
    CONTAINER = "container"

@dataclass
class NormalizedPattern:
    """Normalized pattern for matching"""
    id: str
    pattern_type: MatchStrategy
    field: str
    value: Any
    weight: float = 1.0
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    platform: Optional[PlatformType] = None
    log_source: Optional[LogSourceType] = None

@dataclass
class NormalizedDataComponent:
    """Normalized data component representation"""
    component_id: str
    name: str
    description: str
    tags: List[str]
    patterns: List[NormalizedPattern]
    metadata: Dict[str, Any]
    search_indexes: List[Dict[str, Any]]  # Pre-computed search indexes

@dataclass
class DetectionResult:
    """Detection result structure"""
    datacomponent: str
    asset_id: Optional[str]
    asset_name: Optional[str]
    es_index: str
    document_id: str
    timestamp: str  # ISO8601
    matched_fields: Dict[str, str]
    similarity_score: float
    evidence_snippet: str
    rule_or_pattern: str
    component_id: str
    raw_document: Optional[Dict] = None

@dataclass
class Asset:
    """Asset information"""
    id: str
    name: str
    type: str
    ip_address: Optional[str]
    location: Optional[str]
    manufacturer: Optional[str]
    tags: List[str] = field(default_factory=list)

# ============================================================================
# CONFIGURATION CLASS
# ============================================================================

class DetectionConfig:
    """Configuration for detection module"""
    
    def __init__(self):
        # Elasticsearch configuration
        self.es_hosts = os.getenv('ES_HOSTS')
        self.es_user = os.getenv('ES_USER')
        self.es_password = os.getenv('ES_PASSWORD')
        self.es_use_ssl = os.getenv('ES_USE_SSL', 'false').lower() == 'true'
        self.es_verify_certs = os.getenv('ES_VERIFY_CERTS', 'true').lower() == 'true'
        
        # Detection configuration
        self.default_similarity_threshold = float(os.getenv('SIMILARITY_THRESHOLD', '0.7'))
        self.batch_size = int(os.getenv('BATCH_SIZE', '1000'))
        self.polling_interval = int(os.getenv('POLLING_INTERVAL', '60'))  # seconds
        self.lookback_minutes = int(os.getenv('LOOKBACK_MINUTES', '5'))
        self.max_concurrent_searches = int(os.getenv('MAX_CONCURRENT_SEARCHES', '5'))
        
        # Index patterns
        self.index_patterns = {
            'windows': os.getenv('WINDOWS_INDEX', 'logs-windows-*'),
            'linux': os.getenv('LINUX_INDEX', 'logs-linux-*'),
            'macos': os.getenv('MACOS_INDEX', 'logs-macos-*'),
            'network': os.getenv('NETWORK_INDEX', 'logs-network-*'),
            'cloud': os.getenv('CLOUD_INDEX', 'logs-cloud-*'),
            'container': os.getenv('CONTAINER_INDEX', 'logs-container-*'),
            'security': os.getenv('SECURITY_INDEX', 'logs-security-*'),
            'application': os.getenv('APPLICATION_INDEX', 'logs-application-*'),
            'all': os.getenv('ALL_LOGS_INDEX', 'logs-*')
        }
        
        # State persistence
        self.state_file = os.getenv('STATE_FILE', 'detection_state.json')
        
        # Similarity configuration
        self.enable_embeddings = os.getenv('ENABLE_EMBEDDINGS', 'false').lower() == 'true' and EMBEDDING_AVAILABLE
        self.min_token_overlap = float(os.getenv('MIN_TOKEN_OVERLAP', '0.5'))

# ============================================================================
# DATA COMPONENT NORMALIZER
# ============================================================================

class DataComponentNormalizer:
    """Normalizes MITRE ATT&CK data components into searchable patterns"""
    
    # Platform mappings
    PLATFORM_MAPPINGS = {
        'WinEventLog': PlatformType.WINDOWS,
        'windows': PlatformType.WINDOWS,
        'linux': PlatformType.LINUX,
        'macos': PlatformType.MACOS,
        'esxi': PlatformType.ESXI,
        'kubernetes': PlatformType.KUBERNETES,
        'docker': PlatformType.CONTAINER,
        'containerd': PlatformType.CONTAINER,
        'network': PlatformType.NETWORK,
        'aws': PlatformType.CLOUD,
        'azure': PlatformType.CLOUD,
        'gcp': PlatformType.CLOUD,
        'saas': PlatformType.SAAS,
        'firmware': PlatformType.FIRMWARE
    }
    
    # Log source mappings
    LOG_SOURCE_MAPPINGS = {
        'EventLog': LogSourceType.EVENT_LOG,
        'WinEventLog': LogSourceType.EVENT_LOG,
        'Sysmon': LogSourceType.EVENT_LOG,
        'syslog': LogSourceType.SYSLOG,
        'auditd': LogSourceType.AUDIT,
        'audit': LogSourceType.AUDIT,
        'Application': LogSourceType.APPLICATION,
        'EDR': LogSourceType.ENDPOINT,
        'endpoint': LogSourceType.ENDPOINT,
        'network': LogSourceType.NETWORK,
        'cloud': LogSourceType.CLOUD,
        'firmware': LogSourceType.FIRMWARE,
        'container': LogSourceType.CONTAINER
    }
    
    # Field mappings for different log types
    FIELD_MAPPINGS = {
        'event_id': ['event_id', 'event.code', 'winlog.event_id', 'EventID'],
        'event_name': ['event_name', 'event.action', 'winlog.event_data.SubjectUserName'],
        'process_name': ['process.name', 'process.executable', 'winlog.event_data.NewProcessName'],
        'command_line': ['process.command_line', 'process.args', 'winlog.event_data.CommandLine'],
        'user': ['user.name', 'winlog.event_data.TargetUserName', 'SubjectUserName'],
        'source_ip': ['source.ip', 'client.ip', 'src_ip'],
        'destination_ip': ['destination.ip', 'server.ip', 'dst_ip'],
        'log_message': ['message', 'event.original', 'log'],
        'file_path': ['file.path', 'winlog.event_data.ObjectName'],
        'registry_key': ['registry.key', 'winlog.event_data.ObjectName'],
        'service_name': ['service.name', 'winlog.event_data.ServiceName']
    }
    
    @classmethod
    def normalize(cls, data_component: Dict) -> NormalizedDataComponent:
        """Normalize a data component into searchable patterns"""
        
        component_id = data_component.get('id', 'unknown')
        name = data_component.get('name', 'Unnamed')
        description = data_component.get('description', '')
        
        # Extract all possible patterns from the data component
        patterns = cls._extract_patterns(data_component)
        
        # Generate tags
        tags = cls._generate_tags(data_component, patterns)
        
        # Create metadata
        metadata = {
            'original_id': component_id,
            'original_name': name,
            'examples': data_component.get('examples', []),
            'data_collection_measures': data_component.get('data_collection_measures', {}),
            'log_sources': data_component.get('log_sources', [])
        }
        
        # Create search indexes
        search_indexes = cls._create_search_indexes(patterns, tags)
        
        return NormalizedDataComponent(
            component_id=component_id,
            name=name,
            description=description,
            tags=tags,
            patterns=patterns,
            metadata=metadata,
            search_indexes=search_indexes
        )
    
    @classmethod
    def _extract_patterns(cls, data_component: Dict) -> List[NormalizedPattern]:
        """Extract patterns from data component"""
        patterns = []
        pattern_counter = 0
        
        # Extract from log_sources
        log_sources = data_component.get('log_sources', [])
        for log_source in log_sources:
            source_patterns = cls._parse_log_source(log_source, pattern_counter)
            patterns.extend(source_patterns)
            pattern_counter += len(source_patterns)
        
        # Extract from data_collection_measures
        measures = data_component.get('data_collection_measures', {})
        measure_patterns = cls._parse_data_collection_measures(measures, pattern_counter)
        patterns.extend(measure_patterns)
        pattern_counter += len(measure_patterns)
        
        # Extract from description and examples (for context)
        context_patterns = cls._extract_context_patterns(data_component, pattern_counter)
        patterns.extend(context_patterns)
        
        return patterns
    
    @classmethod
    def _parse_log_source(cls, log_source: Dict, start_id: int) -> List[NormalizedPattern]:
        """Parse a log source entry into patterns"""
        patterns = []
        
        name = log_source.get('Name', '')
        channel = log_source.get('Channel', '')
        
        # Parse platform and log source type
        platform, log_source_type = cls._parse_source_name(name)
        
        # Generate pattern ID
        pattern_id = f"{hashlib.md5(f'{name}:{channel}'.encode()).hexdigest()[:8]}_{start_id}"
        
        # Different parsing strategies based on source type
        if platform == PlatformType.WINDOWS:
            patterns.extend(cls._parse_windows_log_source(name, channel, pattern_id, platform, log_source_type))
        elif platform == PlatformType.LINUX:
            patterns.extend(cls._parse_linux_log_source(name, channel, pattern_id, platform, log_source_type))
        elif platform == PlatformType.MACOS:
            patterns.extend(cls._parse_macos_log_source(name, channel, pattern_id, platform, log_source_type))
        elif platform == PlatformType.NETWORK:
            patterns.extend(cls._parse_network_log_source(name, channel, pattern_id, platform, log_source_type))
        else:
            # Generic parsing
            patterns.extend(cls._parse_generic_log_source(name, channel, pattern_id, platform, log_source_type))
        
        return patterns
    
    @classmethod
    def _parse_windows_log_source(cls, name: str, channel: str, pattern_id: str, 
                                 platform: PlatformType, log_source_type: LogSourceType) -> List[NormalizedPattern]:
        """Parse Windows log sources"""
        patterns = []
        
        # Parse Event IDs
        if 'EventCode=' in channel:
            event_codes = cls._extract_event_codes(channel)
            for event_code in event_codes:
                patterns.append(NormalizedPattern(
                    id=f"{pattern_id}_evt_{event_code}",
                    pattern_type=MatchStrategy.EXACT,
                    field='event_id',
                    value=event_code,
                    weight=0.9,
                    description=f"Windows Event ID {event_code}",
                    tags=['windows', 'eventlog', 'security'],
                    platform=platform,
                    log_source=log_source_type
                ))
        
        # Parse Sysmon events
        elif 'Sysmon' in name and 'EventCode=' in channel:
            event_codes = cls._extract_event_codes(channel)
            for event_code in event_codes:
                patterns.append(NormalizedPattern(
                    id=f"{pattern_id}_sysmon_{event_code}",
                    pattern_type=MatchStrategy.EXACT,
                    field='event_id',
                    value=event_code,
                    weight=0.95,
                    description=f"Sysmon Event {event_code}",
                    tags=['windows', 'sysmon', 'endpoint'],
                    platform=platform,
                    log_source=log_source_type
                ))
        
        # Parse PowerShell events
        elif 'PowerShell' in name:
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_ps",
                pattern_type=MatchStrategy.REGEX,
                field='log_message',
                value=r'PowerShell.*(4103|4104|4105|4106)',  # PowerShell script block logging
                weight=0.85,
                description="PowerShell script execution",
                tags=['windows', 'powershell', 'scripting'],
                platform=platform,
                log_source=log_source_type
            ))
        
        return patterns
    
    @classmethod
    def _parse_linux_log_source(cls, name: str, channel: str, pattern_id: str,
                               platform: PlatformType, log_source_type: LogSourceType) -> List[NormalizedPattern]:
        """Parse Linux log sources"""
        patterns = []
        
        # Parse auditd rules
        if 'auditd' in name.lower():
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_audit",
                pattern_type=MatchStrategy.REGEX,
                field='log_message',
                value=channel,
                weight=0.85,
                description=f"auditd rule: {channel}",
                tags=['linux', 'auditd', 'security'],
                platform=platform,
                log_source=log_source_type
            ))
        
        # Parse syslog messages
        elif 'syslog' in name.lower() or name.lower() == 'linux':
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_syslog",
                pattern_type=MatchStrategy.REGEX,
                field='log_message',
                value=channel,
                weight=0.8,
                description=f"Syslog pattern: {channel}",
                tags=['linux', 'syslog'],
                platform=platform,
                log_source=log_source_type
            ))
        
        # Parse cron jobs
        elif 'cron' in name.lower():
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_cron",
                pattern_type=MatchStrategy.REGEX,
                field='process_name',
                value=r'(cron|crond)',
                weight=0.9,
                description="Cron job execution",
                tags=['linux', 'cron', 'scheduled'],
                platform=platform,
                log_source=log_source_type
            ))
        
        return patterns
    
    @classmethod
    def _parse_macos_log_source(cls, name: str, channel: str, pattern_id: str,
                               platform: PlatformType, log_source_type: LogSourceType) -> List[NormalizedPattern]:
        """Parse macOS log sources"""
        patterns = []
        
        # Parse unified logs
        if 'unifiedlog' in name.lower():
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_unified",
                pattern_type=MatchStrategy.REGEX,
                field='log_message',
                value=channel,
                weight=0.85,
                description=f"macOS Unified Log: {channel}",
                tags=['macos', 'unifiedlog', 'apple'],
                platform=platform,
                log_source=log_source_type
            ))
        
        # Parse launchd
        elif 'launchd' in name.lower():
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_launchd",
                pattern_type=MatchStrategy.REGEX,
                field='process_name',
                value=r'launchd',
                weight=0.9,
                description="launchd service",
                tags=['macos', 'launchd', 'service'],
                platform=platform,
                log_source=log_source_type
            ))
        
        return patterns
    
    @classmethod
    def _parse_network_log_source(cls, name: str, channel: str, pattern_id: str,
                                 platform: PlatformType, log_source_type: LogSourceType) -> List[NormalizedPattern]:
        """Parse network log sources"""
        patterns = []
        
        # Parse network device logs
        if 'network' in name.lower():
            patterns.append(NormalizedPattern(
                id=f"{pattern_id}_network",
                pattern_type=MatchStrategy.REGEX,
                field='log_message',
                value=channel,
                weight=0.8,
                description=f"Network device log: {channel}",
                tags=['network', 'device', 'syslog'],
                platform=platform,
                log_source=log_source_type
            ))
        
        return patterns
    
    @classmethod
    def _parse_generic_log_source(cls, name: str, channel: str, pattern_id: str,
                                 platform: PlatformType, log_source_type: LogSourceType) -> List[NormalizedPattern]:
        """Parse generic log sources"""
        return [NormalizedPattern(
            id=pattern_id,
            pattern_type=MatchStrategy.REGEX,
            field='log_message',
            value=channel if channel and channel != 'None' else name,
            weight=0.7,
            description=f"Generic pattern: {name} - {channel}",
            tags=['generic', 'log'],
            platform=platform,
            log_source=log_source_type
        )]
    
    @classmethod
    def _parse_data_collection_measures(cls, measures: Dict, start_id: int) -> List[NormalizedPattern]:
        """Parse data collection measures"""
        patterns = []
        pattern_id = start_id
        
        if not isinstance(measures, dict):
            return patterns
        
        for measure_type, measure_details in measures.items():
            if isinstance(measure_details, list):
                for detail in measure_details:
                    if isinstance(detail, dict):
                        # Extract event IDs
                        if 'event' in detail:
                            event = detail['event']
                            if isinstance(event, dict) and 'id' in event:
                                patterns.append(NormalizedPattern(
                                    id=f"measure_{pattern_id}",
                                    pattern_type=MatchStrategy.EXACT,
                                    field='event_id',
                                    value=event['id'],
                                    weight=0.85,
                                    description=f"Data collection measure: {event.get('name', 'Unknown')}",
                                    tags=['measure', 'collection'],
                                    platform=None,
                                    log_source=None
                                ))
                                pattern_id += 1
            elif isinstance(measure_details, str):
                # Extract patterns from description
                patterns.append(NormalizedPattern(
                    id=f"measure_{pattern_id}",
                    pattern_type=MatchStrategy.REGEX,
                    field='log_message',
                    value=re.escape(measure_details[:100]),  # Limit length
                    weight=0.6,
                    description=f"Measure description: {measure_details[:50]}...",
                    tags=['measure', 'description'],
                    platform=None,
                    log_source=None
                ))
                pattern_id += 1
        
        return patterns
    
    @classmethod
    def _extract_context_patterns(cls, data_component: Dict, start_id: int) -> List[NormalizedPattern]:
        """Extract patterns from context (description, examples)"""
        patterns = []
        pattern_id = start_id
        
        # Extract from description
        description = data_component.get('description', '')
        if description:
            # Extract key terms
            key_terms = re.findall(r'\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b', description)
            for term in set(key_terms):
                if len(term) > 3:  # Filter out short terms
                    patterns.append(NormalizedPattern(
                        id=f"ctx_{pattern_id}",
                        pattern_type=MatchStrategy.TOKEN_OVERLAP,
                        field='log_message',
                        value=term.lower(),
                        weight=0.4,
                        description=f"Context term: {term}",
                        tags=['context', 'description'],
                        platform=None,
                        log_source=None
                    ))
                    pattern_id += 1
        
        # Extract from examples
        examples = data_component.get('examples', [])
        for i, example in enumerate(examples):
            if isinstance(example, str):
                patterns.append(NormalizedPattern(
                    id=f"ex_{pattern_id}",
                    pattern_type=MatchStrategy.TOKEN_OVERLAP,
                    field='log_message',
                    value=example[:100].lower(),
                    weight=0.3,
                    description=f"Example: {example[:50]}...",
                    tags=['example', 'context'],
                    platform=None,
                    log_source=None
                ))
                pattern_id += 1
        
        return patterns
    
    @classmethod
    def _parse_source_name(cls, name: str) -> Tuple[Optional[PlatformType], Optional[LogSourceType]]:
        """Parse source name to extract platform and log source type"""
        platform = None
        log_source = None
        
        name_lower = name.lower()
        
        # Determine platform
        for key, plat in cls.PLATFORM_MAPPINGS.items():
            if key.lower() in name_lower:
                platform = plat
                break
        
        # Determine log source type
        for key, source in cls.LOG_SOURCE_MAPPINGS.items():
            if key.lower() in name_lower:
                log_source = source
                break
        
        return platform, log_source
    
    @classmethod
    def _extract_event_codes(cls, channel: str) -> List[str]:
        """Extract event codes from channel string"""
        event_codes = []
        
        # Pattern for EventCode=XXX or EventCode=XXX, YYY, ZZZ
        match = re.search(r'EventCode\s*=\s*([\d,\s]+)', channel, re.IGNORECASE)
        if match:
            codes = re.findall(r'\d+', match.group(1))
            event_codes.extend(codes)
        
        # Also look for standalone event codes
        standalone_codes = re.findall(r'\b(?:4[0-9]{3}|1[0-9]{3})\b', channel)
        event_codes.extend(standalone_codes)
        
        return list(set(event_codes))  # Remove duplicates
    
    @classmethod
    def _generate_tags(cls, data_component: Dict, patterns: List[NormalizedPattern]) -> List[str]:
        """Generate tags from data component and patterns"""
        tags = set()
        
        # Add component ID and name as tags
        component_id = data_component.get('id', '')
        component_name = data_component.get('name', '')
        
        tags.add(f"component:{component_id}")
        tags.add(f"name:{component_name.lower().replace(' ', '_')}")
        
        # Add platform tags from patterns
        for pattern in patterns:
            if pattern.platform:
                tags.add(f"platform:{pattern.platform.value}")
            if pattern.log_source:
                tags.add(f"source:{pattern.log_source.value}")
            tags.update(pattern.tags)
        
        # Add tags from data collection measures
        measures = data_component.get('data_collection_measures', {})
        for measure_type in measures.keys():
            tags.add(f"measure:{measure_type}")
        
        return list(tags)
    
    @classmethod
    def _create_search_indexes(cls, patterns: List[NormalizedPattern], tags: List[str]) -> List[Dict[str, Any]]:
        """Create optimized search indexes"""
        indexes = []
        
        # Group patterns by platform and source type
        pattern_groups = defaultdict(list)
        for pattern in patterns:
            key = f"{pattern.platform.value if pattern.platform else 'generic'}:{pattern.log_source.value if pattern.log_source else 'unknown'}"
            pattern_groups[key].append(pattern)
        
        # Create indexes for each group
        for group_key, group_patterns in pattern_groups.items():
            platform, source = group_key.split(':')
            
            # Determine Elasticsearch index pattern
            index_pattern = cls._get_index_pattern(platform, source)
            
            # Create field mappings for this group
            field_mappings = defaultdict(list)
            for pattern in group_patterns:
                if pattern.field:
                    field_mappings[pattern.field].append(pattern)
            
            indexes.append({
                'id': hashlib.md5(group_key.encode()).hexdigest()[:8],
                'platform': platform,
                'source_type': source,
                'index_pattern': index_pattern,
                'field_mappings': dict(field_mappings),
                'pattern_count': len(group_patterns),
                'tags': [t for t in tags if platform in t or source in t]
            })
        
        # Add a generic index for all patterns
        indexes.append({
            'id': 'all',
            'platform': 'all',
            'source_type': 'all',
            'index_pattern': 'logs-*',
            'field_mappings': defaultdict(list),
            'pattern_count': len(patterns),
            'tags': tags
        })
        
        return indexes
    
    @classmethod
    def _get_index_pattern(cls, platform: str, source_type: str) -> str:
        """Get Elasticsearch index pattern based on platform and source"""
        config = DetectionConfig()
        
        if platform == 'windows':
            return config.index_patterns['windows']
        elif platform == 'linux':
            return config.index_patterns['linux']
        elif platform == 'macos':
            return config.index_patterns['macos']
        elif platform == 'network':
            return config.index_patterns['network']
        elif platform in ['cloud', 'aws', 'azure', 'gcp']:
            return config.index_patterns['cloud']
        elif platform in ['container', 'kubernetes', 'docker']:
            return config.index_patterns['container']
        elif 'event' in source_type or 'audit' in source_type:
            return config.index_patterns['security']
        elif 'application' in source_type:
            return config.index_patterns['application']
        
        return config.index_patterns['all']

# ============================================================================
# ELASTICSEARCH CLIENT
# ============================================================================

class ElasticsearchClient:
    """Elasticsearch client with retry and backoff support"""
    
    def __init__(self, config: DetectionConfig):
        self.config = config
        self.client = None
        self.async_client = None
        self.connect()
    
    def connect(self):
        """Connect to Elasticsearch"""
        try:
            es_kwargs = {
                'hosts': self.config.es_hosts,
                'max_retries': 3,
                'retry_on_timeout': True,
                'request_timeout': 30
            }
            
            if self.config.es_user and self.config.es_password:
                es_kwargs['http_auth'] = (self.config.es_user, self.config.es_password)
            
            if self.config.es_use_ssl:
                es_kwargs['use_ssl'] = True
                es_kwargs['verify_certs'] = self.config.es_verify_certs
            
            self.client = Elasticsearch(**es_kwargs)
            
            # Test connection
            try:
                self.client.info()
            except Exception as e:
                raise ConnectionError("Cannot connect to Elasticsearch") from e
            
            logger.info(f"Connected to Elasticsearch at {self.config.es_hosts}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            raise
    
    async def connect_async(self):
        """Connect async client"""
        try:
            es_kwargs = {
                'hosts': self.config.es_hosts,
                'max_retries': 3,
                'retry_on_timeout': True,
                'request_timeout': 30
            }
            
            if self.config.es_user and self.config.es_password:
                es_kwargs['http_auth'] = (self.config.es_user, self.config.es_password)
            
            if self.config.es_use_ssl:
                es_kwargs['use_ssl'] = True
                es_kwargs['verify_certs'] = self.config.es_verify_certs
            
            self.async_client = AsyncElasticsearch(**es_kwargs)
            
            # Test connection
            if not await self.async_client.ping():
                raise ConnectionError("Cannot connect to Elasticsearch")
            
            logger.info(f"Connected to Elasticsearch async client at {self.config.es_hosts}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch async: {e}")
            raise
    
    def build_query(self, normalized_component: NormalizedDataComponent, 
                   time_range: Dict[str, str] = None) -> Dict:
        """Build Elasticsearch query from normalized component"""
        
        if time_range is None:
            time_range = {
                'gte': f"now-{self.config.lookback_minutes}m",
                'lte': 'now'
            }
        
        # Start with time range filter
        must_conditions = [{
            'range': {
                '@timestamp': time_range
            }
        }]
        
        # Add platform/source filters if available
        should_conditions = []
        
        for index in normalized_component.search_indexes:
            if index['platform'] != 'all':
                # Add platform filter
                platform_filter = self._create_platform_filter(index['platform'])
                if platform_filter:
                    should_conditions.append(platform_filter)
        
        if should_conditions:
            must_conditions.append({
                'bool': {
                    'should': should_conditions,
                    'minimum_should_match': 1
                }
            })
        
        # Add pattern matching conditions
        pattern_queries = []
        for pattern in normalized_component.patterns:
            query = self._pattern_to_query(pattern)
            if query:
                pattern_queries.append(query)
        
        # If we have pattern queries, add them as should conditions
        if pattern_queries:
            query_body = {
                'query': {
                    'bool': {
                        'must': must_conditions,
                        'should': pattern_queries,
                        'minimum_should_match': 1,
                        'boost': 1.0
                    }
                },
                'sort': [
                    {'@timestamp': {'order': 'desc'}}
                ],
                '_source': True,
                'size': self.config.batch_size,
                'track_total_hits': True
            }
        else:
            # Fallback to simple time-based query
            query_body = {
                'query': {
                    'bool': {
                        'must': must_conditions
                    }
                },
                'sort': [
                    {'@timestamp': {'order': 'desc'}}
                ],
                '_source': True,
                'size': self.config.batch_size
            }
        
        return query_body
    
    def _pattern_to_query(self, pattern: NormalizedPattern) -> Optional[Dict]:
        """Convert a pattern to Elasticsearch query"""
        
        # Map pattern field to actual Elasticsearch fields
        es_fields = self._map_field_to_es_fields(pattern.field)
        
        if not es_fields:
            return None
        
        query_conditions = []
        
        for es_field in es_fields:
            if pattern.pattern_type == MatchStrategy.EXACT:
                query_conditions.append({
                    'term': {
                        es_field: {
                            'value': pattern.value,
                            'boost': pattern.weight
                        }
                    }
                })
            
            elif pattern.pattern_type == MatchStrategy.REGEX:
                query_conditions.append({
                    'regexp': {
                        es_field: {
                            'value': pattern.value,
                            'boost': pattern.weight
                        }
                    }
                })
            
            elif pattern.pattern_type == MatchStrategy.FIELD_EXISTS:
                query_conditions.append({
                    'exists': {
                        'field': es_field,
                        'boost': pattern.weight
                    }
                })
            
            elif pattern.pattern_type == MatchStrategy.TOKEN_OVERLAP:
                # Use match query with fuzziness for token overlap
                query_conditions.append({
                    'match': {
                        es_field: {
                            'query': pattern.value,
                            'fuzziness': 'AUTO',
                            'boost': pattern.weight * 0.7
                        }
                    }
                })
        
        if not query_conditions:
            return None
        
        if len(query_conditions) == 1:
            return query_conditions[0]
        else:
            return {
                'bool': {
                    'should': query_conditions,
                    'minimum_should_match': 1
                }
            }
    
    def _map_field_to_es_fields(self, field: str) -> List[str]:
        """Map pattern field to Elasticsearch field names"""
        
        # Direct mapping
        if field in ['event_id', 'event.code']:
            return ['event_id', 'event.code', 'winlog.event_id', 'EventID']
        elif field in ['log_message', 'message']:
            return ['message', 'event.original', 'log.original']
        elif field in ['process_name', 'process.name']:
            return ['process.name', 'process.executable', 'winlog.event_data.NewProcessName']
        elif field in ['user', 'user.name']:
            return ['user.name', 'winlog.event_data.TargetUserName', 'SubjectUserName']
        elif field in ['source_ip', 'source.ip']:
            return ['source.ip', 'client.ip', 'src_ip']
        elif field in ['destination_ip', 'destination.ip']:
            return ['destination.ip', 'server.ip', 'dst_ip']
        elif field in ['file_path', 'file.path']:
            return ['file.path', 'winlog.event_data.ObjectName']
        elif field in ['registry_key', 'registry.key']:
            return ['registry.key', 'winlog.event_data.ObjectName']
        elif field in ['service_name', 'service.name']:
            return ['service.name', 'winlog.event_data.ServiceName']
        elif field in ['command_line', 'process.command_line']:
            return ['process.command_line', 'process.args', 'winlog.event_data.CommandLine']
        
        # Try field as-is
        return [field]
    
    def _create_platform_filter(self, platform: str) -> Optional[Dict]:
        """Create platform filter for Elasticsearch query"""
        
        platform_mappings = {
            'windows': [
                {'term': {'agent.type': 'winlogbeat'}},
                {'term': {'event.module': 'windows'}},
                {'exists': {'field': 'winlog'}},
                {'prefix': {'log.file.path': 'C:\\'}}
            ],
            'linux': [
                {'term': {'agent.type': 'filebeat'}},
                {'term': {'event.module': 'system'}},
                {'prefix': {'log.file.path': '/var/log/'}},
                {'term': {'host.os.platform': 'linux'}}
            ],
            'macos': [
                {'term': {'host.os.platform': 'macos'}},
                {'term': {'event.module': 'macos'}},
                {'prefix': {'log.file.path': '/var/log/'}}
            ],
            'network': [
                {'term': {'event.module': 'zeek'}},
                {'term': {'event.module': 'suricata'}},
                {'exists': {'field': 'network'}},
                {'exists': {'field': 'suricata'}}
            ],
            'cloud': [
                {'term': {'event.module': 'aws'}},
                {'term': {'event.module': 'azure'}},
                {'term': {'event.module': 'gcp'}},
                {'exists': {'field': 'cloud'}}
            ],
            'container': [
                {'term': {'event.module': 'docker'}},
                {'term': {'event.module': 'kubernetes'}},
                {'exists': {'field': 'container'}},
                {'exists': {'field': 'kubernetes'}}
            ]
        }
        
        if platform in platform_mappings:
            return {
                'bool': {
                    'should': platform_mappings[platform],
                    'minimum_should_match': 1
                }
            }
        
        return None
    
    async def search_component(self, normalized_component: NormalizedDataComponent,
                             time_range: Dict = None) -> List[Dict]:
        """Search for component patterns in Elasticsearch"""
        
        if not self.async_client:
            await self.connect_async()
        
        all_results = []
        
        # Search in each relevant index
        for index_info in normalized_component.search_indexes:
            if index_info['platform'] == 'all':
                continue  # Skip generic index for now
            
            index_pattern = index_info['index_pattern']
            query = self.build_query(normalized_component, time_range)
            
            try:
                # Execute search
                response = await self.async_client.search(
                    index=index_pattern,
                    body=query,
                    request_timeout=30
                )
                
                hits = response.get('hits', {}).get('hits', [])
                total = response.get('hits', {}).get('total', {}).get('value', 0)
                
                if hits:
                    logger.info(f"Found {total} hits in {index_pattern} for {normalized_component.name}")
                    
                    for hit in hits:
                        hit['_index_info'] = index_info
                        all_results.append(hit)
                
            except Exception as e:
                logger.error(f"Error searching index {index_pattern}: {e}")
                continue
        
        return all_results
    
    def search_component_sync(self, normalized_component: NormalizedDataComponent,
                            time_range: Dict = None) -> List[Dict]:
        """Synchronous search for component patterns"""
        
        all_results = []
        
        # Search in each relevant index
        for index_info in normalized_component.search_indexes:
            if index_info['platform'] == 'all':
                continue  # Skip generic index for now
            
            index_pattern = index_info['index_pattern']
            query = self.build_query(normalized_component, time_range)
            
            try:
                # Execute search
                response = self.client.search(
                    index=index_pattern,
                    body=query,
                    request_timeout=30
                )
                
                hits = response.get('hits', {}).get('hits', [])
                total = response.get('hits', {}).get('total', {}).get('value', 0)
                
                if hits:
                    logger.info(f"Found {total} hits in {index_pattern} for {normalized_component.name}")
                    
                    for hit in hits:
                        hit['_index_info'] = index_info
                        all_results.append(hit)
                
            except Exception as e:
                logger.error(f"Error searching index {index_pattern}: {e}")
                continue
        
        return all_results
    
    async def scroll_search(self, normalized_component: NormalizedDataComponent,
                          time_range: Dict = None, max_docs: int = 10000) -> List[Dict]:
        """Scroll search for large result sets"""
        
        if not self.async_client:
            await self.connect_async()
        
        all_results = []
        
        for index_info in normalized_component.search_indexes:
            if index_info['platform'] == 'all':
                continue
            
            index_pattern = index_info['index_pattern']
            query = self.build_query(normalized_component, time_range)
            
            try:
                # Use async scan for scrolling
                async for hit in async_scan(
                    client=self.async_client,
                    index=index_pattern,
                    query=query['query'],
                    preserve_order=True,
                    size=self.config.batch_size,
                    request_timeout=30
                ):
                    hit['_index_info'] = index_info
                    all_results.append(hit)
                    
                    if len(all_results) >= max_docs:
                        break
                
            except Exception as e:
                logger.error(f"Error in scroll search for {index_pattern}: {e}")
                continue
        
        return all_results[:max_docs]

# ============================================================================
# PATTERN MATCHER
# ============================================================================

class PatternMatcher:
    """Matches logs against patterns with multiple strategies"""
    
    def __init__(self, config: DetectionConfig):
        self.config = config
        
        # Initialize TF-IDF vectorizer if embeddings enabled
        if config.enable_embeddings and EMBEDDING_AVAILABLE:
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            self.embeddings_cache = {}
        else:
            self.vectorizer = None
    
    def match_document(self, document: Dict, pattern: NormalizedPattern) -> Tuple[bool, float, Dict]:
        """Match a document against a pattern"""
        
        # Get field value from document
        field_value = self._extract_field_value(document, pattern.field)
        
        if field_value is None:
            return False, 0.0, {}
        
        # Apply matching strategy
        if pattern.pattern_type == MatchStrategy.EXACT:
            matched, score = self._exact_match(field_value, pattern.value)
        
        elif pattern.pattern_type == MatchStrategy.REGEX:
            matched, score = self._regex_match(field_value, pattern.value)
        
        elif pattern.pattern_type == MatchStrategy.TOKEN_OVERLAP:
            matched, score = self._token_overlap_match(field_value, pattern.value)
        
        elif pattern.pattern_type == MatchStrategy.COSINE_SIMILARITY:
            matched, score = self._cosine_similarity_match(field_value, pattern.value)
        
        elif pattern.pattern_type == MatchStrategy.FIELD_EXISTS:
            matched = True
            score = 1.0
        
        elif pattern.pattern_type == MatchStrategy.FUZZY:
            matched, score = self._fuzzy_match(field_value, pattern.value)
        
        else:
            matched, score = False, 0.0
        
        # Apply pattern weight
        weighted_score = score * pattern.weight
        
        # Prepare matched fields
        matched_fields = {
            pattern.field: str(field_value)[:200]  # Truncate for output
        }
        
        return matched, weighted_score, matched_fields
    
    def _extract_field_value(self, document: Dict, field_path: str) -> Any:
        """Extract field value from document using dot notation"""
        
        # Handle nested fields
        if '.' in field_path:
            parts = field_path.split('.')
            value = document
            
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            
            return value
        
        # Direct field access
        return document.get(field_path)
    
    def _exact_match(self, field_value: Any, pattern_value: Any) -> Tuple[bool, float]:
        """Exact match strategy"""
        
        if isinstance(field_value, (int, float)) and isinstance(pattern_value, (int, float)):
            matched = field_value == pattern_value
        else:
            matched = str(field_value).strip().lower() == str(pattern_value).strip().lower()
        
        return matched, 1.0 if matched else 0.0
    
    def _regex_match(self, field_value: Any, pattern: str) -> Tuple[bool, float]:
        """Regex match strategy"""
        
        try:
            if isinstance(field_value, (int, float)):
                field_str = str(field_value)
            else:
                field_str = str(field_value)
            
            match = re.search(pattern, field_str, re.IGNORECASE)
            return bool(match), 1.0 if match else 0.0
            
        except re.error:
            logger.warning(f"Invalid regex pattern: {pattern}")
            return False, 0.0
    
    def _token_overlap_match(self, field_value: Any, pattern_value: str) -> Tuple[bool, float]:
        """Token overlap match strategy"""
        
        if not field_value or not pattern_value:
            return False, 0.0
        
        # Convert to strings and tokenize
        field_tokens = set(str(field_value).lower().split())
        pattern_tokens = set(str(pattern_value).lower().split())
        
        if not field_tokens or not pattern_tokens:
            return False, 0.0
        
        # Calculate Jaccard similarity
        intersection = len(field_tokens.intersection(pattern_tokens))
        union = len(field_tokens.union(pattern_tokens))
        
        similarity = intersection / union if union > 0 else 0.0
        
        matched = similarity >= self.config.min_token_overlap
        return matched, similarity
    
    def _cosine_similarity_match(self, field_value: Any, pattern_value: str) -> Tuple[bool, float]:
        """Cosine similarity match strategy"""
        
        if not self.vectorizer or not EMBEDDING_AVAILABLE:
            # Fallback to token overlap
            return self._token_overlap_match(field_value, pattern_value)
        
        try:
            # Convert to strings
            field_str = str(field_value)
            pattern_str = str(pattern_value)
            
            # Create or retrieve embeddings
            cache_key = f"{field_str}|{pattern_str}"
            
            if cache_key not in self.embeddings_cache:
                # Fit and transform
                texts = [field_str, pattern_str]
                tfidf_matrix = self.vectorizer.fit_transform(texts)
                similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                self.embeddings_cache[cache_key] = similarity
            else:
                similarity = self.embeddings_cache[cache_key]
            
            matched = similarity >= self.config.default_similarity_threshold
            return matched, similarity
            
        except Exception as e:
            logger.error(f"Cosine similarity error: {e}")
            return False, 0.0
    
    def _fuzzy_match(self, field_value: Any, pattern_value: str) -> Tuple[bool, float]:
        """Fuzzy match strategy"""
        
        from difflib import SequenceMatcher
        
        field_str = str(field_value)
        pattern_str = str(pattern_value)
        
        similarity = SequenceMatcher(None, field_str.lower(), pattern_str.lower()).ratio()
        
        matched = similarity >= self.config.default_similarity_threshold
        return matched, similarity
    
    def match_all_patterns(self, document: Dict, patterns: List[NormalizedPattern],
                         threshold: float = None) -> Tuple[bool, float, Dict, str]:
        """Match document against all patterns"""
        
        if threshold is None:
            threshold = self.config.default_similarity_threshold
        
        best_score = 0.0
        best_pattern = None
        best_fields = {}
        
        for pattern in patterns:
            matched, score, matched_fields = self.match_document(document, pattern)
            
            if matched and score > best_score:
                best_score = score
                best_pattern = pattern
                best_fields = matched_fields
        
        # Check if best score meets threshold
        if best_score >= threshold:
            pattern_name = best_pattern.description if best_pattern else "Unknown"
            return True, best_score, best_fields, pattern_name
        else:
            return False, best_score, {}, ""

# ============================================================================
# ASSET REGISTER
# ============================================================================

class AssetRegister:
    """Manages asset information and correlation"""
    
    def __init__(self, assets: List[Asset]):
        self.assets = assets
        
        # Create lookup dictionaries
        self.by_id = {asset.id: asset for asset in assets}
        self.by_ip = {}
        self.by_name = {}
        
        for asset in assets:
            self.by_name[asset.name] = asset
            if asset.ip_address:
                self.by_ip[asset.ip_address] = asset
    
    @classmethod
    def from_file(cls, filepath: str) -> 'AssetRegister':
        """Load asset register from JSON file"""
        
        try:
            with open(filepath, 'r') as f:
                asset_data = json.load(f)
            
            assets = []
            for item in asset_data:
                asset = Asset(
                    id=item.get('id'),
                    name=item.get('name'),
                    type=item.get('type'),
                    ip_address=item.get('ip_address'),
                    location=item.get('location'),
                    manufacturer=item.get('manufacturer'),
                    tags=item.get('tags', [])
                )
                assets.append(asset)
            
            return cls(assets)
            
        except Exception as e:
            logger.error(f"Failed to load asset register: {e}")
            return cls([])
    
    def find_asset_by_log(self, log_document: Dict) -> Optional[Asset]:
        """Find asset associated with a log document"""
        
        # Try by hostname
        hostname = log_document.get('host', {}).get('name')
        if hostname and hostname in self.by_name:
            return self.by_name[hostname]
        
        # Try by IP address
        source_ip = log_document.get('source', {}).get('ip')
        if source_ip and source_ip in self.by_ip:
            return self.by_ip[source_ip]
        
        destination_ip = log_document.get('destination', {}).get('ip')
        if destination_ip and destination_ip in self.by_ip:
            return self.by_ip[destination_ip]
        
        # Try by client IP
        client_ip = log_document.get('client', {}).get('ip')
        if client_ip and client_ip in self.by_ip:
            return self.by_ip[client_ip]
        
        # Try by server IP
        server_ip = log_document.get('server', {}).get('ip')
        if server_ip and server_ip in self.by_ip:
            return self.by_ip[server_ip]
        
        # Try by log source field
        log_source = log_document.get('log', {}).get('source', {}).get('address')
        if log_source and log_source in self.by_ip:
            return self.by_ip[log_source]
        
        return None

# ============================================================================
# DETECTION ENGINE
# ============================================================================

class DetectionEngine:
    """Main detection engine"""
    
    def __init__(self, config: DetectionConfig):
        self.config = config
        self.es_client = ElasticsearchClient(config)
        self.matcher = PatternMatcher(config)
        self.asset_register = None
        self.state = self._load_state()
    
    def set_asset_register(self, asset_register: AssetRegister):
        """Set asset register for correlation"""
        self.asset_register = asset_register
    
    def _load_state(self) -> Dict:
        """Load detection state from file"""
        
        try:
            if os.path.exists(self.config.state_file):
                with open(self.config.state_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
        
        return {
            'last_processed_timestamp': datetime.utcnow().isoformat(),
            'processed_documents': {},
            'alert_count': 0
        }
    
    def _save_state(self):
        """Save detection state to file"""
        
        try:
            with open(self.config.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def normalize_component(self, component_file: str) -> NormalizedDataComponent:
        """Load and normalize a data component"""
        
        try:
            with open(component_file, 'r') as f:
                component_data = json.load(f)
            
            normalizer = DataComponentNormalizer()
            normalized = normalizer.normalize(component_data)
            
            logger.info(f"Normalized component: {normalized.name} with {len(normalized.patterns)} patterns")
            return normalized
            
        except Exception as e:
            logger.error(f"Failed to normalize component {component_file}: {e}")
            raise
    
    async def detect_component(self, normalized_component: NormalizedDataComponent,
                             time_range: Dict = None) -> List[DetectionResult]:
        """Detect component in logs"""
        
        # Build query and search
        hits = await self.es_client.search_component(normalized_component, time_range)
        
        detections = []
        processed_ids = set()
        
        for hit in hits:
            doc_id = hit.get('_id')
            doc_index = hit.get('_index')
            doc_source = hit.get('_source', {})
            
            # Skip if already processed
            if doc_id in processed_ids:
                continue
            
            processed_ids.add(doc_id)
            
            # Match against patterns
            matched, score, matched_fields, pattern_name = self.matcher.match_all_patterns(
                doc_source, normalized_component.patterns
            )
            
            if not matched or score < self.config.default_similarity_threshold:
                continue
            
            # Find associated asset
            asset_id = None
            asset_name = None
            
            if self.asset_register:
                asset = self.asset_register.find_asset_by_log(doc_source)
                if asset:
                    asset_id = asset.id
                    asset_name = asset.name
            
            # Get timestamp
            timestamp = doc_source.get('@timestamp', 
                                     doc_source.get('timestamp',
                                     datetime.utcnow().isoformat()))
            
            # Create evidence snippet
            evidence_snippet = self._create_evidence_snippet(doc_source, matched_fields)
            
            # Create detection result
            detection = DetectionResult(
                datacomponent=normalized_component.name,
                asset_id=asset_id,
                asset_name=asset_name,
                es_index=doc_index,
                document_id=doc_id,
                timestamp=timestamp,
                matched_fields=matched_fields,
                similarity_score=round(score, 3),
                evidence_snippet=evidence_snippet,
                rule_or_pattern=pattern_name,
                component_id=normalized_component.component_id,
                raw_document=doc_source
            )
            
            detections.append(detection)
            
            # Update state
            self.state['processed_documents'][doc_id] = {
                'timestamp': timestamp,
                'component': normalized_component.name,
                'score': score
            }
        
        self.state['alert_count'] += len(detections)
        self._save_state()
        
        return detections
    
    def detect_component_sync(self, normalized_component: NormalizedDataComponent,
                            time_range: Dict = None) -> List[DetectionResult]:
        """Synchronous detection"""
        
        hits = self.es_client.search_component_sync(normalized_component, time_range)
        
        detections = []
        processed_ids = set()
        
        for hit in hits:
            doc_id = hit.get('_id')
            doc_index = hit.get('_index')
            doc_source = hit.get('_source', {})
            
            if doc_id in processed_ids:
                continue
            
            processed_ids.add(doc_id)
            
            matched, score, matched_fields, pattern_name = self.matcher.match_all_patterns(
                doc_source, normalized_component.patterns
            )
            
            if not matched or score < self.config.default_similarity_threshold:
                continue
            
            asset_id = None
            asset_name = None
            
            if self.asset_register:
                asset = self.asset_register.find_asset_by_log(doc_source)
                if asset:
                    asset_id = asset.id
                    asset_name = asset.name
            
            timestamp = doc_source.get('@timestamp', 
                                     doc_source.get('timestamp',
                                     datetime.utcnow().isoformat()))
            
            evidence_snippet = self._create_evidence_snippet(doc_source, matched_fields)
            
            detection = DetectionResult(
                datacomponent=normalized_component.name,
                asset_id=asset_id,
                asset_name=asset_name,
                es_index=doc_index,
                document_id=doc_id,
                timestamp=timestamp,
                matched_fields=matched_fields,
                similarity_score=round(score, 3),
                evidence_snippet=evidence_snippet,
                rule_or_pattern=pattern_name,
                component_id=normalized_component.component_id,
                raw_document=doc_source
            )
            
            detections.append(detection)
            
            self.state['processed_documents'][doc_id] = {
                'timestamp': timestamp,
                'component': normalized_component.name,
                'score': score
            }
        
        self.state['alert_count'] += len(detections)
        self._save_state()
        
        return detections
    
    def _create_evidence_snippet(self, document: Dict, matched_fields: Dict) -> str:
        """Create evidence snippet from document"""
        
        # Try to get message field
        message = document.get('message', 
                             document.get('event', {}).get('original',
                             str(document)[:200]))
        
        # Truncate and add matched fields info
        snippet = str(message)[:150]
        
        if matched_fields:
            fields_str = ', '.join([f"{k}: {v[:50]}..." for k, v in matched_fields.items()])
            snippet = f"{snippet} [Matched: {fields_str}]"
        
        return snippet
    
    async def polling_mode(self, normalized_components: List[NormalizedDataComponent],
                         callback=None):
        """Run in polling mode"""
        
        logger.info(f"Starting polling mode with {len(normalized_components)} components")
        
        while True:
            try:
                current_time = datetime.utcnow()
                lookback_time = current_time - timedelta(minutes=self.config.lookback_minutes)
                
                time_range = {
                    'gte': lookback_time.isoformat(),
                    'lte': current_time.isoformat()
                }
                
                all_detections = []
                
                for component in normalized_components:
                    detections = await self.detect_component(component, time_range)
                    all_detections.extend(detections)
                    
                    if detections and callback:
                        for detection in detections:
                            callback(detection)
                
                if all_detections:
                    logger.info(f"Found {len(all_detections)} detections in polling cycle")
                
                # Wait for next polling interval
                await asyncio.sleep(self.config.polling_interval)
                
            except KeyboardInterrupt:
                logger.info("Polling interrupted by user")
                break
            except Exception as e:
                logger.error(f"Error in polling mode: {e}")
                await asyncio.sleep(60)  # Wait before retry
    
    def batch_mode(self, normalized_components: List[NormalizedDataComponent],
                  start_time: str, end_time: str) -> List[DetectionResult]:
        """Run in batch mode for backfill"""
        
        logger.info(f"Starting batch mode from {start_time} to {end_time}")
        
        time_range = {
            'gte': start_time,
            'lte': end_time
        }
        
        all_detections = []
        
        for component in normalized_components:
            detections = self.detect_component_sync(component, time_range)
            all_detections.extend(detections)
            
            if detections:
                logger.info(f"Found {len(detections)} detections for {component.name}")
        
        logger.info(f"Batch processing complete. Total detections: {len(all_detections)}")
        return all_detections

# ============================================================================
# MAIN APPLICATION
# ============================================================================

def detection_callback(detection: DetectionResult):
    """Callback function for detections"""
    
    alert = {
        "datacomponent": detection.datacomponent,
        "asset_id": detection.asset_id,
        "asset_name": detection.asset_name,
        "es_index": detection.es_index,
        "document_id": detection.document_id,
        "timestamp": detection.timestamp,
        "matched_fields": detection.matched_fields,
        "similarity_score": detection.similarity_score,
        "evidence_snippet": detection.evidence_snippet,
        "rule_or_pattern": detection.rule_or_pattern,
        "component_id": detection.component_id
    }
    
    # Print alert (in production, send to SIEM, write to file, etc.)
    print(json.dumps(alert, indent=2))
    
    # Also log it
    logger.info(f"Detection: {detection.datacomponent} - Score: {detection.similarity_score}")

async def main():
    """Main application entry point"""
    
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description='MITRE ATT&CK ICS DataComponent Detector')
    parser.add_argument('--component', required=True, help='Data component JSON file')
    parser.add_argument('--assets', help='Asset register JSON file')
    parser.add_argument('--mode', choices=['polling', 'batch', 'oneshot'], 
                       default='oneshot', help='Detection mode')
    parser.add_argument('--start-time', help='Start time for batch mode (ISO8601)')
    parser.add_argument('--end-time', help='End time for batch mode (ISO8601)')
    parser.add_argument('--output', help='Output file for detections')
    
    args = parser.parse_args()
    
    # Load configuration
    config = DetectionConfig()
    
    # Initialize detection engine
    engine = DetectionEngine(config)
    
    # Load asset register if provided
    if args.assets:
        asset_register = AssetRegister.from_file(args.assets)
        engine.set_asset_register(asset_register)
        logger.info(f"Loaded asset register with {len(asset_register.assets)} assets")
    
    # Normalize data component
    normalized_component = engine.normalize_component(args.component)
    
    # Run in selected mode
    if args.mode == 'polling':
        # Run polling mode
        await engine.polling_mode([normalized_component], callback=detection_callback)
    
    elif args.mode == 'batch':
        if not args.start_time or not args.end_time:
            logger.error("Batch mode requires --start-time and --end-time")
            return
        
        # Run batch mode
        detections = engine.batch_mode(
            [normalized_component],
            args.start_time,
            args.end_time
        )
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump([d.__dict__ for d in detections], f, indent=2, default=str)
            logger.info(f"Saved {len(detections)} detections to {args.output}")
        else:
            for detection in detections:
                detection_callback(detection)
    
    else:  # oneshot mode
        # Run one-shot detection
        detections = await engine.detect_component(normalized_component)
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump([d.__dict__ for d in detections], f, indent=2, default=str)
            logger.info(f"Saved {len(detections)} detections to {args.output}")
        else:
            for detection in detections:
                detection_callback(detection)

if __name__ == "__main__":
    # Run the application
    asyncio.run(main())