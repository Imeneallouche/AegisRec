"""
ICS/OT Asset Register Normalization Agent
==========================================
This agent normalizes diverse industrial asset registers into a standardized template
for use in AI-powered ICS security detection and mitigation systems.

Author: AI Security Team
Version: 1.0.0
"""

import os
import json
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from pathlib import Path
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# STANDARD ASSET REGISTER SCHEMA DEFINITION
# ============================================================================

class AssetType(Enum):
    """Standardized asset type enumeration"""
    PHYSICAL_DEVICE = "physical_device"
    VIRTUAL_MACHINE = "virtual_machine"
    NETWORK_INTERFACE = "network_interface"
    IP_RESOURCE = "ip_resource"
    NETWORK_CABLE = "network_cable"
    CLUSTER = "cluster"
    PLATFORM = "platform"


@dataclass
class StandardAsset:
    """Core asset information - the foundation of our template"""
    # Identity
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    
    # Classification
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    platform: Optional[str] = None
    role: Optional[str] = None
    
    # Status
    status: Optional[str] = None
    operational_state: Optional[str] = None
    
    # Location
    site: Optional[str] = None
    location: Optional[str] = None
    rack: Optional[str] = None
    rack_position: Optional[str] = None
    
    # Description
    description: Optional[str] = None
    comments: Optional[str] = None
    tags: Optional[List[str]] = None
    
    # Metadata
    created: Optional[str] = None
    last_updated: Optional[str] = None
    
    # Confidence scoring
    confidence_score: float = 0.0
    source_mapping: Optional[Dict[str, str]] = None


@dataclass
class StandardPhysicalDevice(StandardAsset):
    """Extended schema for physical devices (PLCs, RTUs, HMIs, switches, etc.)"""
    # Hardware specifics
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    firmware_version: Optional[str] = None
    
    # Network
    primary_ip_address: Optional[str] = None
    ipv4_address: Optional[str] = None
    ipv6_address: Optional[str] = None
    mac_address: Optional[str] = None
    management_ip: Optional[str] = None
    
    # Physical characteristics
    device_type: Optional[str] = None
    form_factor: Optional[str] = None
    power_specifications: Optional[str] = None
    
    # Relationships
    parent_device: Optional[str] = None
    cluster: Optional[str] = None
    tenant: Optional[str] = None
    
    # Monitoring
    monitoring_enabled: bool = False
    monitoring_hostid: Optional[str] = None


@dataclass
class StandardVirtualMachine(StandardAsset):
    """Extended schema for virtual machines"""
    # Compute resources
    vcpus: Optional[int] = None
    memory_mb: Optional[int] = None
    disk_gb: Optional[int] = None
    
    # Network
    primary_ip_address: Optional[str] = None
    ipv4_address: Optional[str] = None
    ipv6_address: Optional[str] = None
    
    # Virtual infrastructure
    cluster: Optional[str] = None
    host_device: Optional[str] = None
    
    # Monitoring
    monitoring_enabled: bool = False
    monitoring_hostid: Optional[str] = None


@dataclass
class StandardNetworkInterface:
    """Network interface schema"""
    interface_id: Optional[str] = None
    interface_name: Optional[str] = None
    parent_device: Optional[str] = None
    parent_vm: Optional[str] = None
    
    # Configuration
    enabled: bool = True
    interface_type: Optional[str] = None
    speed: Optional[str] = None
    duplex: Optional[str] = None
    mtu: Optional[int] = None
    
    # Layer 2
    mac_address: Optional[str] = None
    vlan_untagged: Optional[str] = None
    vlan_tagged: Optional[List[str]] = None
    
    # Layer 3
    ip_addresses: Optional[List[str]] = None
    
    # Physical connectivity
    connected_to_interface: Optional[str] = None
    connected_to_device: Optional[str] = None
    cable_id: Optional[str] = None
    
    # Metadata
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence_score: float = 0.0


@dataclass
class StandardIPAddress:
    """IP address schema"""
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    vrf: Optional[str] = None
    
    # Assignment
    status: Optional[str] = None
    role: Optional[str] = None
    assigned_to_interface: Optional[str] = None
    assigned_to_device: Optional[str] = None
    dns_name: Optional[str] = None
    
    # NAT
    nat_inside: Optional[str] = None
    nat_outside: Optional[str] = None
    
    # Metadata
    description: Optional[str] = None
    tenant: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence_score: float = 0.0


@dataclass
class StandardConnection:
    """Physical/logical connection schema"""
    connection_id: Optional[str] = None
    
    # Endpoints
    device_a: Optional[str] = None
    interface_a: Optional[str] = None
    device_b: Optional[str] = None
    interface_b: Optional[str] = None
    
    # Cable information
    cable_type: Optional[str] = None
    cable_length: Optional[str] = None
    cable_color: Optional[str] = None
    
    # Status
    status: Optional[str] = None
    verified: bool = False
    
    # Metadata
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence_score: float = 0.0


# ============================================================================
# LLM API CLIENT
# ============================================================================

class OpenRouterClient:
    """Client for OpenRouter API using Llama 3.1 405B"""
    
    def __init__(self, api_key: str, site_url: str = "ICS-Asset-Normalizer", 
                 site_name: str = "ICS Asset Register Normalizer"):
        self.api_key = api_key
        self.site_url = site_url
        self.site_name = site_name
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "google/gemini-2.0-flash-exp:free"
        
    def call(self, messages: List[Dict[str, str]], 
             temperature: float = 0.1, 
             max_tokens: int = 4000) -> Optional[str]:
        """
        Call the OpenRouter API with retry logic
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (lower = more deterministic)
            max_tokens: Maximum tokens in response
            
        Returns:
            Response content string or None on failure
        """
        try:
            response = requests.post(
                url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": self.site_url,
                    "X-Title": self.site_name,
                },
                data=json.dumps({
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }),
                timeout=120
            )
            
            response.raise_for_status()
            result = response.json()
            
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                logger.info(f"LLM call successful, response length: {len(content)}")
                return content
            else:
                logger.error(f"Unexpected API response format: {result}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse API response: {e}")
            return None


# ============================================================================
# ASSET REGISTER ANALYZER
# ============================================================================

class AssetRegisterAnalyzer:
    """Analyzes and understands the structure of input asset registers"""
    
    def __init__(self, llm_client: OpenRouterClient):
        self.llm_client = llm_client
        
    def analyze_structure(self, excel_file_path: str) -> Dict[str, Any]:
        """
        Analyze the structure of an Excel asset register
        
        Returns a dictionary containing:
        - sheet_names: List of sheet names
        - sheet_metadata: Dict mapping sheet name to column info and sample data
        """
        try:
            excel_file = pd.ExcelFile(excel_file_path)
            sheet_names = excel_file.sheet_names
            
            sheet_metadata = {}
            for sheet_name in sheet_names:
                df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
                
                # Get column names
                columns = df.columns.tolist()
                
                # Get sample data (first 3 rows, handling NaN values)
                sample_data = []
                for idx in range(min(3, len(df))):
                    row_dict = {}
                    for col in columns:
                        value = df.iloc[idx][col]
                        # Convert NaN to None for JSON serialization
                        if pd.isna(value):
                            row_dict[col] = None
                        else:
                            row_dict[col] = str(value)
                    sample_data.append(row_dict)
                
                sheet_metadata[sheet_name] = {
                    "columns": columns,
                    "row_count": len(df),
                    "sample_data": sample_data
                }
            
            return {
                "sheet_names": sheet_names,
                "sheet_metadata": sheet_metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze Excel structure: {e}")
            raise
    
    def understand_semantic_meaning(self, structure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to understand the semantic meaning of sheets and columns
        """
        # Create a concise representation for the LLM
        sheets_summary = {}
        for sheet_name, metadata in structure['sheet_metadata'].items():
            sheets_summary[sheet_name] = {
                "columns": metadata["columns"],
                "sample_row": metadata["sample_data"][0] if metadata["sample_data"] else {}
            }
        
        prompt = f"""You are an expert in industrial control systems (ICS/OT) and IT asset management.

Analyze this asset register structure and provide semantic understanding:

{json.dumps(sheets_summary, indent=2)}

For each sheet, determine:
1. Primary purpose (e.g., "Physical devices", "Virtual machines", "IP addresses", "Network connections")
2. Asset type it represents (physical_device, virtual_machine, network_interface, ip_resource, network_cable, cluster, platform, or other)
3. Key identifier column(s)
4. Relationship to other sheets (parent-child, references, etc.)

Respond ONLY with valid JSON in this exact format:
{{
  "sheet_name": {{
    "purpose": "Brief description",
    "asset_type": "one of the standard types",
    "key_columns": ["primary_id_column", "name_column"],
    "relationships": {{"related_sheet": "relationship_type"}}
  }}
}}

Be precise and concise. Do not include any text outside the JSON structure."""

        messages = [{"role": "user", "content": prompt}]
        response = self.llm_client.call(messages, temperature=0.1)
        
        if not response:
            logger.warning("LLM analysis failed, using fallback heuristics")
            return self._fallback_analysis(structure)
        
        try:
            # Extract JSON from response (handle markdown code blocks)
            response_clean = response.strip()
            if response_clean.startswith("```"):
                # Remove markdown code block markers
                lines = response_clean.split('\n')
                response_clean = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_clean
                response_clean = response_clean.replace("```json", "").replace("```", "").strip()
            
            semantic_info = json.loads(response_clean)
            logger.info("Successfully extracted semantic meaning from LLM")
            return semantic_info
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM response as JSON: {e}")
            return self._fallback_analysis(structure)
    
    def _fallback_analysis(self, structure: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback heuristic-based analysis if LLM fails"""
        semantic_info = {}
        
        for sheet_name in structure['sheet_names']:
            sheet_lower = sheet_name.lower()
            
            # Simple heuristics
            if 'device' in sheet_lower and 'virtual' not in sheet_lower:
                asset_type = "physical_device"
                purpose = "Physical devices and equipment"
            elif 'virtual' in sheet_lower or 'vm' in sheet_lower:
                asset_type = "virtual_machine"
                purpose = "Virtual machines"
            elif 'interface' in sheet_lower:
                asset_type = "network_interface"
                purpose = "Network interfaces"
            elif 'ip' in sheet_lower and 'address' in sheet_lower:
                asset_type = "ip_resource"
                purpose = "IP address assignments"
            elif 'cable' in sheet_lower or 'connection' in sheet_lower:
                asset_type = "network_cable"
                purpose = "Physical connections"
            elif 'cluster' in sheet_lower:
                asset_type = "cluster"
                purpose = "Compute clusters"
            elif 'platform' in sheet_lower:
                asset_type = "platform"
                purpose = "Platform definitions"
            else:
                asset_type = "other"
                purpose = "Other asset information"
            
            semantic_info[sheet_name] = {
                "purpose": purpose,
                "asset_type": asset_type,
                "key_columns": [],
                "relationships": {}
            }
        
        return semantic_info


# ============================================================================
# ASSET NORMALIZER
# ============================================================================

class AssetNormalizer:
    """Normalizes assets from source format to standard template"""
    
    def __init__(self, llm_client: OpenRouterClient):
        self.llm_client = llm_client
        self.confidence_threshold = 0.6  # Below this, leave field as None
        
    def normalize_sheet(self, sheet_name: str, df: pd.DataFrame, 
                       semantic_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Normalize a single sheet to standard format
        
        Returns list of normalized asset dictionaries with confidence scores
        """
        if sheet_name not in semantic_info:
            logger.warning(f"No semantic info for sheet {sheet_name}, skipping")
            return []
        
        info = semantic_info[sheet_name]
        asset_type = info.get('asset_type', 'other')
        
        # Process in batches to avoid token limits
        batch_size = 10
        all_normalized = []
        
        for batch_start in range(0, len(df), batch_size):
            batch_end = min(batch_start + batch_size, len(df))
            batch_df = df.iloc[batch_start:batch_end]
            
            normalized_batch = self._normalize_batch(
                sheet_name, batch_df, asset_type, info
            )
            all_normalized.extend(normalized_batch)
            
            logger.info(f"Normalized {batch_end}/{len(df)} rows from {sheet_name}")
        
        return all_normalized
    
    def _normalize_batch(self, sheet_name: str, batch_df: pd.DataFrame,
                        asset_type: str, info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Normalize a batch of rows"""
        
        # Convert batch to list of dicts
        batch_data = []
        for idx, row in batch_df.iterrows():
            row_dict = {}
            for col in batch_df.columns:
                value = row[col]
                row_dict[col] = None if pd.isna(value) else str(value)
            batch_data.append(row_dict)
        
        # Get standard schema fields based on asset type
        if asset_type == "physical_device":
            schema_fields = list(StandardPhysicalDevice.__annotations__.keys())
        elif asset_type == "virtual_machine":
            schema_fields = list(StandardVirtualMachine.__annotations__.keys())
        elif asset_type == "network_interface":
            schema_fields = list(StandardNetworkInterface.__annotations__.keys())
        elif asset_type == "ip_resource":
            schema_fields = list(StandardIPAddress.__annotations__.keys())
        elif asset_type == "network_cable":
            schema_fields = list(StandardConnection.__annotations__.keys())
        else:
            schema_fields = list(StandardAsset.__annotations__.keys())
        
        prompt = f"""You are normalizing ICS/OT asset data to a standard schema.

TASK: Map source data to standard schema fields with confidence scores.

SOURCE SHEET: {sheet_name}
ASSET TYPE: {asset_type}
PURPOSE: {info.get('purpose', 'Unknown')}

SOURCE DATA (batch):
{json.dumps(batch_data, indent=2)}

STANDARD SCHEMA FIELDS:
{json.dumps(schema_fields, indent=2)}

INSTRUCTIONS:
1. For each source row, create a mapping to standard schema fields
2. For each field, provide a confidence score (0.0 to 1.0):
   - 1.0: Perfect match, certain mapping
   - 0.7-0.9: Good match, high confidence
   - 0.5-0.7: Reasonable match, medium confidence
   - Below 0.5: Low confidence (will be set to null)
3. Leave fields null if no reasonable mapping exists
4. Preserve important identifiers and relationships
5. For list fields (tags, ip_addresses), parse appropriately

Respond ONLY with valid JSON array (one object per source row):
[
  {{
    "asset_id": {{"value": "...", "confidence": 0.95}},
    "asset_name": {{"value": "...", "confidence": 1.0}},
    "manufacturer": {{"value": "...", "confidence": 0.8}},
    ...
  }}
]

Important: 
- Use null for missing/unknown values
- Be conservative with confidence scores
- Do not hallucinate data
- Response must be valid JSON only, no additional text"""

        messages = [{"role": "user", "content": prompt}]
        response = self.llm_client.call(messages, temperature=0.1, max_tokens=4000)
        
        if not response:
            logger.error(f"LLM normalization failed for {sheet_name}")
            return []
        
        try:
            # Clean response
            response_clean = response.strip()
            if response_clean.startswith("```"):
                lines = response_clean.split('\n')
                response_clean = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_clean
                response_clean = response_clean.replace("```json", "").replace("```", "").strip()
            
            normalized_data = json.loads(response_clean)
            
            # Process confidence scores and filter low-confidence values
            filtered_data = []
            for item in normalized_data:
                filtered_item = {}
                overall_confidence = 0.0
                count = 0
                source_mapping = {}
                
                for field, field_data in item.items():
                    if isinstance(field_data, dict) and 'value' in field_data:
                        confidence = field_data.get('confidence', 0.0)
                        value = field_data['value']
                        
                        # Apply confidence threshold
                        if confidence >= self.confidence_threshold:
                            filtered_item[field] = value
                            overall_confidence += confidence
                            count += 1
                            source_mapping[field] = f"confidence_{confidence:.2f}"
                        else:
                            filtered_item[field] = None
                    else:
                        # Handle malformed responses
                        filtered_item[field] = None
                
                # Calculate overall confidence
                if count > 0:
                    filtered_item['confidence_score'] = overall_confidence / count
                else:
                    filtered_item['confidence_score'] = 0.0
                
                filtered_item['source_mapping'] = source_mapping
                filtered_data.append(filtered_item)
            
            return filtered_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse normalization response: {e}")
            return []


# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class ICSAssetRegisterNormalizer:
    """Main orchestrator for the asset register normalization pipeline"""
    
    def __init__(self, openrouter_api_key: str):
        """
        Initialize the normalizer
        
        Args:
            openrouter_api_key: OpenRouter API key
        """
        self.llm_client = OpenRouterClient(openrouter_api_key)
        self.analyzer = AssetRegisterAnalyzer(self.llm_client)
        self.normalizer = AssetNormalizer(self.llm_client)
        
    def normalize_register(self, input_excel_path: str, 
                          output_dir: str = "./normalized_output") -> Dict[str, str]:
        """
        Main normalization pipeline
        
        Args:
            input_excel_path: Path to input Excel file
            output_dir: Directory for output files
            
        Returns:
            Dictionary mapping asset types to output file paths
        """
        logger.info(f"Starting normalization of {input_excel_path}")
        
        # Step 1: Analyze structure
        logger.info("Step 1: Analyzing register structure...")
        structure = self.analyzer.analyze_structure(input_excel_path)
        
        # Step 2: Understand semantic meaning
        logger.info("Step 2: Understanding semantic meaning...")
        semantic_info = self.analyzer.understand_semantic_meaning(structure)
        
        # Save analysis results
        os.makedirs(output_dir, exist_ok=True)
        analysis_path = os.path.join(output_dir, "analysis_results.json")
        with open(analysis_path, 'w') as f:
            json.dump({
                "structure": structure,
                "semantic_info": semantic_info
            }, f, indent=2)
        logger.info(f"Analysis results saved to {analysis_path}")
        
        # Step 3: Normalize each sheet
        logger.info("Step 3: Normalizing assets...")
        normalized_assets = {
            "physical_devices": [],
            "virtual_machines": [],
            "network_interfaces": [],
            "ip_addresses": [],
            "connections": [],
            "other": []
        }
        
        excel_file = pd.ExcelFile(input_excel_path)
        for sheet_name in structure['sheet_names']:
            logger.info(f"Processing sheet: {sheet_name}")
            df = pd.read_excel(input_excel_path, sheet_name=sheet_name)
            
            normalized = self.normalizer.normalize_sheet(
                sheet_name, df, semantic_info
            )
            
            # Categorize by asset type
            if sheet_name in semantic_info:
                asset_type = semantic_info[sheet_name].get('asset_type', 'other')
                
                if asset_type == "physical_device":
                    normalized_assets["physical_devices"].extend(normalized)
                elif asset_type == "virtual_machine":
                    normalized_assets["virtual_machines"].extend(normalized)
                elif asset_type == "network_interface":
                    normalized_assets["network_interfaces"].extend(normalized)
                elif asset_type == "ip_resource":
                    normalized_assets["ip_addresses"].extend(normalized)
                elif asset_type == "network_cable":
                    normalized_assets["connections"].extend(normalized)
                else:
                    normalized_assets["other"].extend(normalized)
        
        # Step 4: Save normalized data
        logger.info("Step 4: Saving normalized assets...")
        output_paths = {}
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for asset_category, assets in normalized_assets.items():
            if not assets:
                continue
                
            # Save as JSON
            json_path = os.path.join(
                output_dir, 
                f"normalized_{asset_category}_{timestamp}.json"
            )
            with open(json_path, 'w') as f:
                json.dump(assets, f, indent=2)
            output_paths[f"{asset_category}_json"] = json_path
            logger.info(f"Saved {len(assets)} {asset_category} to {json_path}")
            
            # Save as Excel
            df_normalized = pd.DataFrame(assets)
            excel_path = os.path.join(
                output_dir,
                f"normalized_{asset_category}_{timestamp}.xlsx"
            )
            df_normalized.to_excel(excel_path, index=False)
            output_paths[f"{asset_category}_excel"] = excel_path
            logger.info(f"Saved {asset_category} Excel to {excel_path}")
        
        # Create summary report
        summary = {
            "timestamp": timestamp,
            "input_file": input_excel_path,
            "total_sheets_processed": len(structure['sheet_names']),
            "assets_normalized": {
                category: len(assets) 
                for category, assets in normalized_assets.items()
            },
            "output_files": output_paths
        }
        
        summary_path = os.path.join(output_dir, f"normalization_summary_{timestamp}.json")
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Normalization complete! Summary saved to {summary_path}")
        return output_paths


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

def main():
    """Example usage of the ICS Asset Register Normalizer"""
    
    # Configuration
    OPENROUTER_API_KEY = "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"
    INPUT_EXCEL_FILE = "asset_register.xlsx"
    OUTPUT_DIRECTORY = "./normalized_assets"
    
    # Validate API key
    if OPENROUTER_API_KEY == "your-api-key-here":
        logger.error("Please set OPENROUTER_API_KEY environment variable")
        return
    
    # Initialize normalizer
    normalizer = ICSAssetRegisterNormalizer(OPENROUTER_API_KEY)
    
    # Run normalization
    try:
        output_paths = normalizer.normalize_register(
            input_excel_path=INPUT_EXCEL_FILE,
            output_dir=OUTPUT_DIRECTORY
        )
        
        print("\n" + "="*60)
        print("NORMALIZATION COMPLETE")
        print("="*60)
        print("\nOutput files:")
        for category, path in output_paths.items():
            print(f"  {category}: {path}")
        print("\n")
        
    except Exception as e:
        logger.error(f"Normalization failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()