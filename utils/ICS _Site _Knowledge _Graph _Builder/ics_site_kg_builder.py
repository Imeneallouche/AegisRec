"""
ICS Site Knowledge Graph Builder
Creates a detailed Knowledge Graph of an industrial site with assets and configurations
"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ICSSiteKGBuilder:
    """Build Industrial Site Knowledge Graph in Neo4j"""
    
    def __init__(self, uri: str, username: str, password: str):
        """
        Initialize Neo4j connection
        
        Args:
            uri: Neo4j database URI (e.g., 'bolt://localhost:7687')
            username: Neo4j username
            password: Neo4j password
        """
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        logger.info("Connected to Neo4j database")
    
    def close(self):
        """Close Neo4j connection"""
        self.driver.close()
        logger.info("Closed Neo4j connection")
    
    def create_constraints_and_indexes(self):
        """Create uniqueness constraints and indexes"""
        constraints = [
            "CREATE CONSTRAINT site_id IF NOT EXISTS FOR (s:Site) REQUIRE s.site_id IS UNIQUE",
            "CREATE CONSTRAINT asset_id IF NOT EXISTS FOR (a:Asset) REQUIRE a.asset_id IS UNIQUE",
            "CREATE CONSTRAINT network_interface_id IF NOT EXISTS FOR (n:NetworkInterface) REQUIRE n.interface_id IS UNIQUE",
            "CREATE CONSTRAINT io_module_id IF NOT EXISTS FOR (i:IOModule) REQUIRE i.module_id IS UNIQUE",
            "CREATE CONSTRAINT tag_id IF NOT EXISTS FOR (t:Tag) REQUIRE t.tag_id IS UNIQUE",
            "CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.account_id IS UNIQUE",
        ]
        
        with self.driver.session() as session:
            for constraint in constraints:
                try:
                    session.run(constraint)
                    logger.info(f"Created constraint: {constraint.split('FOR')[1].split('REQUIRE')[0].strip()}")
                except Exception as e:
                    logger.debug(f"Constraint may already exist: {e}")
    
    def sanitize_value(self, value: Any) -> Any:
        """Clean and sanitize values for Neo4j"""
        if value is None or value == '' or value == 'nan':
            return None
        if isinstance(value, str):
            return value.strip()
        return value
    
    def flatten_dict(self, d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
        """Flatten nested dictionary for Neo4j properties"""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self.flatten_dict(v, new_key, sep=sep).items())
            elif isinstance(v, list):
                # Convert lists to strings or keep as list if supported
                if all(isinstance(x, (str, int, float, bool)) for x in v):
                    items.append((new_key, v))
                else:
                    items.append((new_key, json.dumps(v)))
            else:
                items.append((new_key, v))
        return dict(items)
    
    def create_site_node(self, site_data: Dict) -> str:
        """
        Create Site node from site.json
        
        Args:
            site_data: Dictionary containing site information
            
        Returns:
            site_id of the created site
        """
        logger.info("Creating Site node...")
        
        site_id = site_data.get('site_id')
        
        # Flatten nested structures for properties
        properties = {
            'site_id': site_id,
            'name': site_data.get('name'),
            'description': site_data.get('description'),
            'timezone': site_data.get('timezone'),
            'created_at': site_data.get('created_at'),
        }
        
        # Add location fields
        if 'location' in site_data:
            for k, v in site_data['location'].items():
                properties[f'location_{k}'] = v
        
        # Add contact fields
        if 'contact' in site_data:
            for k, v in site_data['contact'].items():
                properties[f'contact_{k}'] = v
        
        # Remove None values
        properties = {k: v for k, v in properties.items() if v is not None}
        
        with self.driver.session() as session:
            session.run(
                """
                MERGE (s:Site {site_id: $site_id})
                SET s += $props
                """,
                site_id=site_id,
                props=properties
            )
        
        logger.info(f"Site node created: {site_id}")
        return site_id
    
    def create_asset_node(self, asset_data: Dict, site_id: str):
        """
        Create Asset node and link to Site
        
        Args:
            asset_data: Dictionary containing asset information
            site_id: ID of the parent site
        """
        asset_id = asset_data.get('asset_id')
        
        # Prepare properties
        properties = {k: self.sanitize_value(v) for k, v in asset_data.items()}
        
        # Handle tags field (convert comma-separated to list)
        if 'tags' in properties and isinstance(properties['tags'], str):
            properties['tags'] = [t.strip() for t in properties['tags'].split(',')]
        
        # Remove None values
        properties = {k: v for k, v in properties.items() if v is not None}
        
        with self.driver.session() as session:
            session.run(
                """
                MERGE (a:Asset {asset_id: $asset_id})
                SET a += $props
                WITH a
                MATCH (s:Site {site_id: $site_id})
                MERGE (s)-[:HAS_ASSET]->(a)
                """,
                asset_id=asset_id,
                props=properties,
                site_id=site_id
            )
        
        logger.info(f"Asset node created and linked to site: {asset_id}")
    
    def create_network_interfaces(self, asset_id: str, network_config: Dict):
        """
        Create NetworkInterface nodes and link to Asset
        
        Args:
            asset_id: Parent asset ID
            network_config: Network configuration dictionary
        """
        if 'interfaces' not in network_config:
            return
        
        interfaces = network_config['interfaces']
        
        with self.driver.session() as session:
            for idx, interface in enumerate(interfaces):
                interface_id = f"{asset_id}_net_{interface.get('name', idx)}"
                
                properties = {
                    'interface_id': interface_id,
                    'name': interface.get('name'),
                    'ip_address': interface.get('ip_address'),
                    'subnet_mask': interface.get('subnet_mask'),
                    'gateway': interface.get('gateway'),
                    'mac': interface.get('mac'),
                    'protocols': interface.get('protocols', []),
                }
                
                properties = {k: v for k, v in properties.items() if v is not None}
                
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    MERGE (n:NetworkInterface {interface_id: $interface_id})
                    SET n += $props
                    MERGE (a)-[:HAS_NETWORK_INTERFACE]->(n)
                    """,
                    asset_id=asset_id,
                    interface_id=interface_id,
                    props=properties
                )
        
        # Add open ports information
        if 'ports_open' in network_config:
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    SET a.ports_open = $ports
                    """,
                    asset_id=asset_id,
                    ports=network_config['ports_open']
                )
        
        logger.info(f"Created {len(interfaces)} network interface(s) for {asset_id}")
    
    def create_io_modules(self, asset_id: str, io_config: Dict):
        """
        Create IOModule nodes and link to Asset
        
        Args:
            asset_id: Parent asset ID
            io_config: I/O configuration dictionary
        """
        if 'modules' not in io_config:
            return
        
        modules = io_config['modules']
        
        with self.driver.session() as session:
            for module in modules:
                module_id = f"{asset_id}_module_slot{module.get('slot')}"
                
                properties = {
                    'module_id': module_id,
                    'slot': module.get('slot'),
                    'type': module.get('type'),
                    'points': module.get('points'),
                }
                
                properties = {k: v for k, v in properties.items() if v is not None}
                
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    MERGE (m:IOModule {module_id: $module_id})
                    SET m += $props
                    MERGE (a)-[:HAS_IO_MODULE]->(m)
                    """,
                    asset_id=asset_id,
                    module_id=module_id,
                    props=properties
                )
        
        logger.info(f"Created {len(modules)} I/O module(s) for {asset_id}")
    
    def create_tags(self, asset_id: str, io_config: Dict):
        """
        Create Tag nodes and link to Asset
        
        Args:
            asset_id: Parent asset ID
            io_config: I/O configuration dictionary
        """
        if 'tags' not in io_config:
            return
        
        tags = io_config['tags']
        
        with self.driver.session() as session:
            for tag in tags:
                tag_id = f"{asset_id}_{tag.get('tag')}"
                
                properties = {
                    'tag_id': tag_id,
                    'tag_name': tag.get('tag'),
                    'address': tag.get('address'),
                    'data_type': tag.get('data_type'),
                    'description': tag.get('description'),
                }
                
                properties = {k: v for k, v in properties.items() if v is not None}
                
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    MERGE (t:Tag {tag_id: $tag_id})
                    SET t += $props
                    MERGE (a)-[:HAS_TAG]->(t)
                    """,
                    asset_id=asset_id,
                    tag_id=tag_id,
                    props=properties
                )
        
        logger.info(f"Created {len(tags)} tag(s) for {asset_id}")
    
    def create_modbus_config(self, asset_id: str, modbus_config: Dict):
        """
        Create ModbusConfig node and link to Asset
        
        Args:
            asset_id: Parent asset ID
            modbus_config: Modbus configuration dictionary
        """
        if not modbus_config.get('enabled'):
            return
        
        modbus_id = f"{asset_id}_modbus"
        
        properties = {
            'modbus_id': modbus_id,
            'enabled': modbus_config.get('enabled'),
            'unit_id': modbus_config.get('unit_id'),
            'registers': json.dumps(modbus_config.get('registers', [])),
        }
        
        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Asset {asset_id: $asset_id})
                MERGE (m:ModbusConfig {modbus_id: $modbus_id})
                SET m += $props
                MERGE (a)-[:HAS_MODBUS_CONFIG]->(m)
                """,
                asset_id=asset_id,
                modbus_id=modbus_id,
                props=properties
            )
        
        logger.info(f"Created Modbus configuration for {asset_id}")
    
    def create_security_accounts(self, asset_id: str, security_config: Dict):
        """
        Create Account nodes and link to Asset
        
        Args:
            asset_id: Parent asset ID
            security_config: Security configuration dictionary
        """
        if 'accounts' not in security_config:
            return
        
        accounts = security_config['accounts']
        
        with self.driver.session() as session:
            for account in accounts:
                account_id = f"{asset_id}_account_{account.get('username')}"
                
                properties = {
                    'account_id': account_id,
                    'username': account.get('username'),
                    'role': account.get('role'),
                    'last_password_change': account.get('last_password_change'),
                }
                
                properties = {k: v for k, v in properties.items() if v is not None}
                
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    MERGE (acc:Account {account_id: $account_id})
                    SET acc += $props
                    MERGE (a)-[:HAS_ACCOUNT]->(acc)
                    """,
                    asset_id=asset_id,
                    account_id=account_id,
                    props=properties
                )
        
        # Add security settings to asset
        security_props = {
            'ssh_enabled': security_config.get('ssh_enabled'),
            'telnet_enabled': security_config.get('telnet_enabled'),
        }
        
        if 'remote_management' in security_config:
            rm = security_config['remote_management']
            security_props['allowed_subnets'] = rm.get('allowed_subnets', [])
            security_props['jump_host_required'] = rm.get('jump_host_required')
        
        security_props = {k: v for k, v in security_props.items() if v is not None}
        
        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Asset {asset_id: $asset_id})
                SET a += $props
                """,
                asset_id=asset_id,
                props=security_props
            )
        
        logger.info(f"Created {len(accounts)} account(s) for {asset_id}")
    
    def create_asset_configuration(self, asset_id: str, config_data: Dict):
        """
        Create complete asset configuration in the knowledge graph
        
        Args:
            asset_id: Asset ID
            config_data: Complete configuration dictionary
        """
        logger.info(f"Creating configuration for asset: {asset_id}")
        
        # Add device information to asset node
        if 'device' in config_data:
            device_props = {f"device_{k}": v for k, v in config_data['device'].items()}
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    SET a += $props
                    """,
                    asset_id=asset_id,
                    props=device_props
                )
        
        # Create network interfaces
        if 'network' in config_data:
            self.create_network_interfaces(asset_id, config_data['network'])
        
        # Create I/O modules
        if 'io' in config_data:
            self.create_io_modules(asset_id, config_data['io'])
            self.create_tags(asset_id, config_data['io'])
        
        # Create Modbus configuration
        if 'modbus_mapping' in config_data:
            self.create_modbus_config(asset_id, config_data['modbus_mapping'])
        
        # Create security accounts
        if 'security' in config_data:
            self.create_security_accounts(asset_id, config_data['security'])
        
        # Add backup information
        if 'backup' in config_data:
            backup_props = {f"backup_{k}": v for k, v in config_data['backup'].items()}
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    SET a += $props
                    """,
                    asset_id=asset_id,
                    props=backup_props
                )
        
        # Add notes
        if 'notes' in config_data:
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (a:Asset {asset_id: $asset_id})
                    SET a.notes = $notes
                    """,
                    asset_id=asset_id,
                    notes=config_data['notes']
                )
        
        logger.info(f"Configuration created successfully for {asset_id}")
    
    def build_site_knowledge_graph(
        self,
        site_json_path: str,
        assets_csv_path: str,
        configs_dir: str
    ):
        """
        Main method to build the complete site knowledge graph
        
        Args:
            site_json_path: Path to site.json file
            assets_csv_path: Path to assets.csv file
            configs_dir: Directory containing asset configuration JSON files
        """
        logger.info("=" * 60)
        logger.info("Starting ICS Site Knowledge Graph Builder")
        logger.info("=" * 60)
        start_time = datetime.now()
        
        try:
            # Create constraints and indexes
            self.create_constraints_and_indexes()
            
            # 1. Load and create Site node
            logger.info(f"Reading site data from: {site_json_path}")
            with open(site_json_path, 'r', encoding='utf-8') as f:
                site_data = json.load(f)
            
            site_id = self.create_site_node(site_data)
            
            # 2. Load and create Asset nodes
            logger.info(f"Reading assets from: {assets_csv_path}")
            assets = []
            with open(assets_csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    assets.append(row)
                    self.create_asset_node(row, site_id)
            
            logger.info(f"Created {len(assets)} asset(s)")
            
            # 3. Load and create configurations for each asset
            configs_path = Path(configs_dir)
            if configs_path.exists():
                logger.info(f"Loading configurations from: {configs_dir}")
                
                for asset in assets:
                    asset_id = asset['asset_id']
                    config_file = configs_path / f"{asset_id}_config.json"
                    
                    if config_file.exists():
                        logger.info(f"Processing configuration for: {asset_id}")
                        with open(config_file, 'r', encoding='utf-8') as f:
                            config_data = json.load(f)
                        
                        self.create_asset_configuration(asset_id, config_data)
                    else:
                        logger.warning(f"Configuration file not found: {config_file}")
            else:
                logger.warning(f"Configurations directory not found: {configs_dir}")
            
            # Print statistics
            self.print_statistics()
            
            elapsed = datetime.now() - start_time
            logger.info("=" * 60)
            logger.info(f"Knowledge Graph built successfully in {elapsed.total_seconds():.2f} seconds")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"Error building knowledge graph: {e}", exc_info=True)
            raise
    
    def print_statistics(self):
        """Print statistics about the created knowledge graph"""
        logger.info("=" * 60)
        logger.info("Knowledge Graph Statistics")
        logger.info("=" * 60)
        
        with self.driver.session() as session:
            # Count nodes by type
            node_types = ['Site', 'Asset', 'NetworkInterface', 'IOModule', 
                         'Tag', 'ModbusConfig', 'Account']
            
            for node_type in node_types:
                result = session.run(f"MATCH (n:{node_type}) RETURN count(n) as count")
                count = result.single()['count']
                if count > 0:
                    logger.info(f"{node_type} nodes: {count}")
            
            logger.info("-" * 60)
            
            # Count relationships
            result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as rel_type, count(r) as count
                ORDER BY count DESC
            """)
            
            logger.info("Relationships:")
            for record in result:
                logger.info(f"  {record['rel_type']}: {record['count']}")
            
            # Total counts
            result = session.run("MATCH (n) RETURN count(n) as count")
            total_nodes = result.single()['count']
            
            result = session.run("MATCH ()-[r]->() RETURN count(r) as count")
            total_rels = result.single()['count']
            
            logger.info("-" * 60)
            logger.info(f"Total nodes: {total_nodes}")
            logger.info(f"Total relationships: {total_rels}")
        
        logger.info("=" * 60)


def main():
    """Main execution function"""
    # Configuration
    NEO4J_URI = "YOUR URI"
    NEO4J_USERNAME = "neo4j"
    NEO4J_PASSWORD = "YOUR PASSWORD"  
    
    # File paths
    BASE_DIR = Path("YOUR PATH")
    SITE_JSON = BASE_DIR / "site.json"
    ASSETS_CSV = BASE_DIR / "assets.csv"
    CONFIGS_DIR = BASE_DIR / "configs"
    
    # Build the knowledge graph
    builder = ICSSiteKGBuilder(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)
    
    try:
        builder.build_site_knowledge_graph(
            site_json_path=str(SITE_JSON),
            assets_csv_path=str(ASSETS_CSV),
            configs_dir=str(CONFIGS_DIR)
        )
    finally:
        builder.close()


if __name__ == "__main__":
    main()