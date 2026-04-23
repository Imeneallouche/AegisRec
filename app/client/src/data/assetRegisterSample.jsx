const assetRegister = {
    "metadata": {
        "site_name": "ChemCo Manufacturing Plant",
        "location": "Houston, Texas",
        "industry_sector": "Chemical Manufacturing",
        "ics_architecture": "Distributed Control System (DCS) with PLCs",
        "normalization_date": "2024-01-20T10:30:00",
        "standard_version": "1.0",
        "description": "Asset register for chemical processing plant with batch reactors and distillation units"
    },
    "assets": [
        {
            "asset_id": "CHEM-001",
            "asset_name": "Main Process Controller DCS-01",
            "asset_type": "DCS Controller",
            "manufacturer": "Emerson",
            "model": "DeltaV S-series",
            "serial_number": "DV-S-2023-8473",
            "asset_tag": "CMP-DCS-01",
            "description": "Primary DeltaV controller for batch reactor control",
            "status": "Operational",
            "criticality": "Critical",
            "site": "Main Processing Unit",
            "location": "Control Room A",
            "zone": "Level 2",
            "operational_role": "Controller",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.10.10"
            ],
            "mac_address": [
                "00:1B:44:11:3A:B7"
            ],
            "hostname": "dcs-controller-01",
            "firmware_version": "14.3.1",
            "os_version": "Windows 10 IoT Enterprise",
            "protocols": [
                "OPC UA",
                "EtherNet/IP",
                "Modbus TCP"
            ],
            "communication_ports": [
                502,
                44818,
                4840
            ],
            "vulnerabilities": [
                "CVE-2022-33851",
                "CVE-2021-44228"
            ],
            "last_patch_date": "2024-01-15",
            "next_maintenance": "2024-03-01",
            "responsible_team": "Control Systems Engineering",
            "owner": "Operations Department",
            "creation_date": "2022-05-10",
            "last_update": "2024-01-18T14:30:00",
            "data_source": "Netbox Import",
            "notes": "Critical for Reactor R-101 temperature control"
        },
        {
            "asset_id": "CHEM-002",
            "asset_name": "Reactor R-101 PLC",
            "asset_type": "PLC",
            "manufacturer": "Rockwell Automation",
            "model": "ControlLogix 5570",
            "serial_number": "CLX-5570-98765",
            "asset_tag": "R101-PLC-01",
            "description": "PLC controlling primary batch reactor temperature and pressure",
            "status": "Operational",
            "criticality": "Critical",
            "site": "Batch Reactor Area",
            "location": "Field Cabinet B12",
            "zone": "Level 1",
            "operational_role": "Controller",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.20.15"
            ],
            "mac_address": [
                "00:1C:B3:09:85:15"
            ],
            "hostname": "plc-r101",
            "firmware_version": "33.011",
            "os_version": "RSLogix 5000 v33",
            "protocols": [
                "EtherNet/IP",
                "CIP"
            ],
            "communication_ports": [
                44818,
                2222
            ],
            "vulnerabilities": [
                "CVE-2023-3595"
            ],
            "last_patch_date": "2023-11-20",
            "next_maintenance": "2024-02-15",
            "responsible_team": "Maintenance",
            "owner": "Production Department",
            "creation_date": "2021-08-15",
            "last_update": "2024-01-10T09:15:00",
            "data_source": "Manual Entry",
            "notes": "Handles critical safety interlocks for exothermic reaction"
        },
        {
            "asset_id": "CHEM-003",
            "asset_name": "Operator Station HMI-01",
            "asset_type": "HMI",
            "manufacturer": "Wonderware",
            "model": "System Platform 2020",
            "serial_number": "WW-SP-2020-5432",
            "asset_tag": "OP-STATION-01",
            "description": "Primary operator interface for Reactor R-101 and R-102",
            "status": "Operational",
            "criticality": "High",
            "site": "Control Room A",
            "location": "Operator Console 1",
            "zone": "Level 2",
            "operational_role": "Operator Interface",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.10.20"
            ],
            "mac_address": [
                "00:0C:29:AB:CD:EF"
            ],
            "hostname": "hmi-operator-01",
            "firmware_version": "2020.1",
            "os_version": "Windows 10 Enterprise",
            "protocols": [
                "OPC DA",
                "OPC UA"
            ],
            "communication_ports": [
                135,
                445,
                4840
            ],
            "vulnerabilities": [
                "CVE-2021-34527",
                "CVE-2021-1675"
            ],
            "last_patch_date": "2024-01-05",
            "next_maintenance": "2024-04-01",
            "responsible_team": "IT Department",
            "owner": "Operations Department",
            "creation_date": "2020-11-30",
            "last_update": "2024-01-12T11:20:00",
            "data_source": "Active Directory Sync",
            "notes": "Dual-monitor setup, requires 24/7 availability"
        },
        {
            "asset_id": "CHEM-004",
            "asset_name": "Historian Server",
            "asset_type": "Historian Server",
            "manufacturer": "OSIsoft",
            "model": "PI Server 2018",
            "serial_number": "PI-2018-8765",
            "asset_tag": "HIST-SVR-01",
            "description": "PI System server for process data archiving and analysis",
            "status": "Operational",
            "criticality": "High",
            "site": "Server Room",
            "location": "Rack A3",
            "zone": "Level 3",
            "operational_role": "Data Acquisition",
            "security_role": "Server",
            "ip_address": [
                "192.168.30.10",
                "10.10.10.50"
            ],
            "mac_address": [
                "00:50:56:91:23:45"
            ],
            "hostname": "pi-server-01",
            "firmware_version": "2018.2.3",
            "os_version": "Windows Server 2019",
            "protocols": [
                "PI API",
                "OPC DA",
                "SQL"
            ],
            "communication_ports": [
                5450,
                1433,
                135
            ],
            "vulnerabilities": [
                "CVE-2020-1472"
            ],
            "last_patch_date": "2023-12-10",
            "next_maintenance": "2024-02-28",
            "responsible_team": "IT Department",
            "owner": "Engineering Department",
            "creation_date": "2019-03-15",
            "last_update": "2024-01-15T16:45:00",
            "data_source": "VMware vCenter",
            "notes": "Contains 5 years of process data, critical for compliance"
        },
        {
            "asset_id": "CHEM-005",
            "asset_name": "Control Network Switch CORE-01",
            "asset_type": "Network Switch",
            "manufacturer": "Cisco",
            "model": "Catalyst 9300",
            "serial_number": "CAT-9300-12345",
            "asset_tag": "SW-CORE-01",
            "description": "Core switch for control network, connects DCS to field devices",
            "status": "Operational",
            "criticality": "Critical",
            "site": "Server Room",
            "location": "Network Rack B1",
            "zone": "Level 3.5",
            "operational_role": "Network Infrastructure",
            "security_role": "Network Device",
            "ip_address": [
                "192.168.1.1"
            ],
            "mac_address": [
                "A4:4C:C8:12:34:56"
            ],
            "hostname": "switch-core-01",
            "firmware_version": "17.6.1",
            "os_version": "IOS-XE 17.06.01",
            "protocols": [
                "SSH",
                "SNMP",
                "CDP"
            ],
            "communication_ports": [
                22,
                161
            ],
            "vulnerabilities": [
                "CVE-2023-20198"
            ],
            "last_patch_date": "2023-10-25",
            "next_maintenance": "2024-03-15",
            "responsible_team": "Network Operations",
            "owner": "IT Department",
            "creation_date": "2021-06-01",
            "last_update": "2024-01-08T13:10:00",
            "data_source": "Cisco Prime",
            "notes": "VLAN trunking configured, critical network segmentation device"
        },
        {
            "asset_id": "CHEM-006",
            "asset_name": "Safety Instrumented System SIS-01",
            "asset_type": "Safety PLC",
            "manufacturer": "Siemens",
            "model": "S7-400FH",
            "serial_number": "S7-400FH-67890",
            "asset_tag": "SIS-PLC-01",
            "description": "Safety PLC for emergency shutdown system",
            "status": "Operational",
            "criticality": "Critical",
            "site": "Safety Control Room",
            "location": "SIS Cabinet S1",
            "zone": "Level 1",
            "operational_role": "Safety Controller",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.40.10"
            ],
            "mac_address": [
                "00:1E:67:89:AB:CD"
            ],
            "hostname": "sis-plc-01",
            "firmware_version": "6.0.4",
            "os_version": "Step 7 Safety",
            "protocols": [
                "Profinet",
                "Modbus TCP"
            ],
            "communication_ports": [
                102,
                502
            ],
            "vulnerabilities": [],
            "last_patch_date": "2023-09-15",
            "next_maintenance": "2024-01-30",
            "responsible_team": "Safety Engineering",
            "owner": "Safety Department",
            "creation_date": "2020-05-20",
            "last_update": "2024-01-05T08:45:00",
            "data_source": "Manual Entry",
            "notes": "Independent safety system, SIL-3 rated, DO NOT MODIFY without authorization"
        },
        {
            "asset_id": "CHEM-007",
            "asset_name": "Engineering Workstation",
            "asset_type": "Engineering Workstation",
            "manufacturer": "Dell",
            "model": "Precision 3660",
            "serial_number": "DL-PRE-3660-1122",
            "asset_tag": "ENG-WS-01",
            "description": "Engineering station for DCS and PLC programming",
            "status": "Operational",
            "criticality": "Medium",
            "site": "Engineering Office",
            "location": "Desk E5",
            "zone": "Level 3",
            "operational_role": "Engineering Interface",
            "security_role": "Endpoint",
            "ip_address": [
                "10.10.20.50"
            ],
            "mac_address": [
                "00:1F:45:67:89:01"
            ],
            "hostname": "eng-ws-01",
            "firmware_version": "2.8.1",
            "os_version": "Windows 11 Pro",
            "protocols": [
                "RDP",
                "SSH",
                "VNC"
            ],
            "communication_ports": [
                3389,
                22,
                5900
            ],
            "vulnerabilities": [
                "CVE-2023-35359"
            ],
            "last_patch_date": "2024-01-10",
            "next_maintenance": "2024-06-01",
            "responsible_team": "Control Systems Engineering",
            "owner": "Engineering Department",
            "creation_date": "2023-02-14",
            "last_update": "2024-01-16T15:30:00",
            "data_source": "SCCM",
            "notes": "Has DeltaV Engineering, Studio 5000, and TIA Portal installed"
        }
    ],
    "network_interfaces": [
        {
            "interface_id": "INT-CHEM-001-ETH0",
            "asset_id": "CHEM-001",
            "interface_name": "Ethernet0",
            "description": "Primary control network interface",
            "type": "Ethernet",
            "mac_address": "00:1B:44:11:3A:B7",
            "ip_address": "192.168.10.10",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.10.1",
            "vlan": "110",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "SW-CORE-01 Port G1/0/1",
            "connection_type": "Switch"
        },
        {
            "interface_id": "INT-CHEM-002-ETH0",
            "asset_id": "CHEM-002",
            "interface_name": "ENET",
            "description": "Primary Ethernet port",
            "type": "Ethernet",
            "mac_address": "00:1C:B3:09:85:15",
            "ip_address": "192.168.20.15",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.20.1",
            "vlan": "120",
            "speed": "100 Mbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "SW-FIELD-01 Port F1",
            "connection_type": "Switch"
        },
        {
            "interface_id": "INT-CHEM-003-ETH0",
            "asset_id": "CHEM-003",
            "interface_name": "NIC1",
            "description": "Primary network interface",
            "type": "Ethernet",
            "mac_address": "00:0C:29:AB:CD:EF",
            "ip_address": "192.168.10.20",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.10.1",
            "vlan": "110",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "SW-CORE-01 Port G1/0/5",
            "connection_type": "Switch"
        },
        {
            "interface_id": "INT-CHEM-004-ETH0",
            "asset_id": "CHEM-004",
            "interface_name": "vmnic0",
            "description": "Control network vNIC",
            "type": "Virtual Ethernet",
            "mac_address": "00:50:56:91:23:45",
            "ip_address": "192.168.30.10",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.30.1",
            "vlan": "130",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "vSwitch1 PortGroup-CONTROL",
            "connection_type": "Virtual Switch"
        },
        {
            "interface_id": "INT-CHEM-004-ETH1",
            "asset_id": "CHEM-004",
            "interface_name": "vmnic1",
            "description": "Enterprise network vNIC",
            "type": "Virtual Ethernet",
            "mac_address": "00:50:56:91:23:46",
            "ip_address": "10.10.10.50",
            "subnet_mask": "255.255.255.0",
            "gateway": "10.10.10.1",
            "vlan": "310",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "vSwitch1 PortGroup-ENTERPRISE",
            "connection_type": "Virtual Switch"
        }
    ],
    "network_ranges": [
        {
            "range_id": "NET-CONTROL",
            "network_name": "Control Network",
            "start_ip": "192.168.10.1",
            "end_ip": "192.168.10.254",
            "cidr": "192.168.10.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.10.1",
            "vrf": "CONTROL-VRF",
            "purpose": "Control",
            "zone": "Level 2",
            "tenant": "Operations",
            "description": "Primary network for DCS controllers and HMIs"
        },
        {
            "range_id": "NET-FIELD",
            "network_name": "Field Network",
            "start_ip": "192.168.20.1",
            "end_ip": "192.168.20.254",
            "cidr": "192.168.20.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.20.1",
            "vrf": "FIELD-VRF",
            "purpose": "Control",
            "zone": "Level 1",
            "tenant": "Operations",
            "description": "Network for field devices and PLCs in hazardous areas"
        },
        {
            "range_id": "NET-HISTORIAN",
            "network_name": "Historian Network",
            "start_ip": "192.168.30.1",
            "end_ip": "192.168.30.254",
            "cidr": "192.168.30.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.30.1",
            "vrf": "HIST-VRF",
            "purpose": "Data Acquisition",
            "zone": "Level 3",
            "tenant": "Engineering",
            "description": "Dedicated network for PI System and data servers"
        },
        {
            "range_id": "NET-SAFETY",
            "network_name": "Safety Network",
            "start_ip": "192.168.40.1",
            "end_ip": "192.168.40.254",
            "cidr": "192.168.40.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.40.1",
            "vrf": "SAFETY-VRF",
            "purpose": "Safety",
            "zone": "Level 1",
            "tenant": "Safety",
            "description": "Isolated network for Safety Instrumented System"
        },
        {
            "range_id": "NET-ENTERPRISE",
            "network_name": "Enterprise Network",
            "start_ip": "10.10.10.1",
            "end_ip": "10.10.10.254",
            "cidr": "10.10.10.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "10.10.10.1",
            "vrf": "ENTERPRISE-VRF",
            "purpose": "Enterprise",
            "zone": "Level 4",
            "tenant": "Corporate",
            "description": "Corporate network for business systems"
        },
        {
            "range_id": "NET-DMZ",
            "network_name": "DMZ Network",
            "start_ip": "172.16.10.1",
            "end_ip": "172.16.10.254",
            "cidr": "172.16.10.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "172.16.10.1",
            "vrf": "DMZ-VRF",
            "purpose": "DMZ",
            "zone": "DMZ",
            "tenant": "IT",
            "description": "Demilitarized zone for external communications"
        }
    ],
    "connections": [
        {
            "connection_id": "CONN-001",
            "source_asset_id": "CHEM-001",
            "source_interface": "Ethernet0",
            "destination_asset_id": "CHEM-003",
            "destination_interface": "NIC1",
            "connection_type": "Network",
            "protocol": "OPC UA",
            "port": "4840",
            "bandwidth": "1 Gbps",
            "latency": "<10ms",
            "reliability": "High",
            "security_level": "Authenticated"
        },
        {
            "connection_id": "CONN-002",
            "source_asset_id": "CHEM-002",
            "source_interface": "ENET",
            "destination_asset_id": "CHEM-001",
            "destination_interface": "Ethernet0",
            "connection_type": "Network",
            "protocol": "Modbus TCP",
            "port": "502",
            "bandwidth": "100 Mbps",
            "latency": "<50ms",
            "reliability": "High",
            "security_level": "None"
        },
        {
            "connection_id": "CONN-003",
            "source_asset_id": "CHEM-001",
            "source_interface": "Ethernet0",
            "destination_asset_id": "CHEM-004",
            "destination_interface": "vmnic0",
            "connection_type": "Network",
            "protocol": "OPC DA",
            "port": "135",
            "bandwidth": "1 Gbps",
            "latency": "<5ms",
            "reliability": "Critical",
            "security_level": "Authenticated"
        },
        {
            "connection_id": "CONN-004",
            "source_asset_id": "CHEM-006",
            "source_interface": "Profinet",
            "destination_asset_id": "CHEM-002",
            "destination_interface": "ENET",
            "connection_type": "Network",
            "protocol": "Profinet",
            "port": "102",
            "bandwidth": "100 Mbps",
            "latency": "<100ms",
            "reliability": "Critical",
            "security_level": "None"
        },
        {
            "connection_id": "CONN-005",
            "source_asset_id": "CHEM-007",
            "source_interface": "Ethernet0",
            "destination_asset_id": "CHEM-001",
            "destination_interface": "Ethernet0",
            "connection_type": "Network",
            "protocol": "RDP",
            "port": "3389",
            "bandwidth": "1 Gbps",
            "latency": "<20ms",
            "reliability": "Medium",
            "security_level": "VPN + Authentication"
        }
    ],
    "software": [
        {
            "software_id": "SW-CHEM-001-01",
            "asset_id": "CHEM-001",
            "name": "DeltaV Control Software",
            "version": "14.3.1",
            "vendor": "Emerson",
            "type": "DCS Runtime",
            "patch_level": "SP2",
            "end_of_life": "2028-12-31",
            "vulnerabilities": [
                "CVE-2022-33851"
            ]
        },
        {
            "software_id": "SW-CHEM-001-02",
            "asset_id": "CHEM-001",
            "name": "Windows 10 IoT Enterprise",
            "version": "22H2",
            "vendor": "Microsoft",
            "type": "Operating System",
            "patch_level": "Latest",
            "end_of_life": "2032-01-11",
            "vulnerabilities": [
                "CVE-2021-44228",
                "CVE-2023-35359"
            ]
        },
        {
            "software_id": "SW-CHEM-002-01",
            "asset_id": "CHEM-002",
            "name": "RSLogix 5000",
            "version": "33.011",
            "vendor": "Rockwell Automation",
            "type": "PLC Runtime",
            "patch_level": "Update 5",
            "end_of_life": "2025-12-31",
            "vulnerabilities": [
                "CVE-2023-3595"
            ]
        },
        {
            "software_id": "SW-CHEM-003-01",
            "asset_id": "CHEM-003",
            "name": "Wonderware System Platform",
            "version": "2020.1",
            "vendor": "AVEVA",
            "type": "SCADA/HMI",
            "patch_level": "SP1",
            "end_of_life": "2025-06-30",
            "vulnerabilities": []
        },
        {
            "software_id": "SW-CHEM-003-02",
            "asset_id": "CHEM-003",
            "name": "Windows 10 Enterprise",
            "version": "22H2",
            "vendor": "Microsoft",
            "type": "Operating System",
            "patch_level": "Latest",
            "end_of_life": "2025-10-14",
            "vulnerabilities": [
                "CVE-2021-34527",
                "CVE-2021-1675"
            ]
        },
        {
            "software_id": "SW-CHEM-004-01",
            "asset_id": "CHEM-004",
            "name": "OSIsoft PI Server",
            "version": "2018.2.3",
            "vendor": "OSIsoft",
            "type": "Historian",
            "patch_level": "Rollup 15",
            "end_of_life": "2024-12-31",
            "vulnerabilities": []
        },
        {
            "software_id": "SW-CHEM-004-02",
            "asset_id": "CHEM-004",
            "name": "Windows Server 2019",
            "version": "Datacenter",
            "vendor": "Microsoft",
            "type": "Operating System",
            "patch_level": "Latest",
            "end_of_life": "2029-01-09",
            "vulnerabilities": [
                "CVE-2020-1472"
            ]
        },
        {
            "software_id": "SW-CHEM-005-01",
            "asset_id": "CHEM-005",
            "name": "Cisco IOS-XE",
            "version": "17.6.1",
            "vendor": "Cisco",
            "type": "Network OS",
            "patch_level": "MD",
            "end_of_life": "2026-10-31",
            "vulnerabilities": [
                "CVE-2023-20198"
            ]
        }
    ],
    "security_zones": [
        {
            "zone_id": "ZONE-L0",
            "zone_name": "Level 0 - Process",
            "description": "Field devices, sensors, actuators, motor controls",
            "security_requirements": "Physical security, intrinsic safety",
            "network_segment": "Field Network",
            "typical_assets": [
                "Sensors",
                "Actuators",
                "Valves",
                "Motors"
            ]
        },
        {
            "zone_id": "ZONE-L1",
            "zone_name": "Level 1 - Basic Control",
            "description": "PLCs, RTUs, safety systems, local control",
            "security_requirements": "Network segmentation, access control",
            "network_segment": "Field Network, Safety Network",
            "typical_assets": [
                "PLCs",
                "Safety PLCs",
                "RTUs",
                "CHEM-002",
                "CHEM-006"
            ]
        },
        {
            "zone_id": "ZONE-L2",
            "zone_name": "Level 2 - Area Control",
            "description": "DCS, HMIs, supervisory control",
            "security_requirements": "DMZ, firewall rules, authentication",
            "network_segment": "Control Network",
            "typical_assets": [
                "DCS Controllers",
                "HMIs",
                "CHEM-001",
                "CHEM-003"
            ]
        },
        {
            "zone_id": "ZONE-L3",
            "zone_name": "Level 3 - Site Operations",
            "description": "Historian, engineering workstations, site servers",
            "security_requirements": "Network segmentation, patch management",
            "network_segment": "Historian Network",
            "typical_assets": [
                "Historian Servers",
                "Engineering Stations",
                "CHEM-004",
                "CHEM-007"
            ]
        },
        {
            "zone_id": "ZONE-L4",
            "zone_name": "Level 4 - Enterprise",
            "description": "Business systems, ERP, corporate network",
            "security_requirements": "Standard IT security practices",
            "network_segment": "Enterprise Network",
            "typical_assets": [
                "ERP Systems",
                "Email Servers",
                "File Servers"
            ]
        },
        {
            "zone_id": "ZONE-DMZ",
            "zone_name": "DMZ",
            "description": "Demilitarized zone for external communications",
            "security_requirements": "Strict firewall rules, IDS/IPS",
            "network_segment": "DMZ Network",
            "typical_assets": [
                "Web Servers",
                "VPN Gateways",
                "Remote Access"
            ]
        }
    ],
    "protocols_used": [
        {
            "protocol_id": "PROT-001",
            "protocol_name": "OPC UA",
            "standard": "IEC 62541",
            "purpose": "Secure data exchange between control systems",
            "ports": [
                4840,
                4843
            ],
            "encryption": "TLS 1.2+",
            "authentication": "X.509 Certificates",
            "vulnerabilities": [
                "CVE-2021-27432"
            ],
            "security_recommendations": "Use certificate-based authentication, enable encryption"
        },
        {
            "protocol_id": "PROT-002",
            "protocol_name": "Modbus TCP",
            "standard": "Modbus.org",
            "purpose": "PLC communication, simple data acquisition",
            "ports": [
                502
            ],
            "encryption": "None",
            "authentication": "None",
            "vulnerabilities": [
                "CVE-2019-16879",
                "CVE-2012-1823"
            ],
            "security_recommendations": "Restrict to trusted networks, consider Modbus/TCP Security"
        },
        {
            "protocol_id": "PROT-003",
            "protocol_name": "EtherNet/IP",
            "standard": "ODVA",
            "purpose": "Industrial Ethernet protocol for PLCs",
            "ports": [
                44818,
                2222
            ],
            "encryption": "Optional (CIP Security)",
            "authentication": "Optional",
            "vulnerabilities": [
                "CVE-2023-3595"
            ],
            "security_recommendations": "Implement CIP Security, network segmentation"
        },
        {
            "protocol_id": "PROT-004",
            "protocol_name": "Profinet",
            "standard": "IEC 61158",
            "purpose": "Real-time industrial Ethernet for process automation",
            "ports": [
                102,
                34962,
                34963,
                34964
            ],
            "encryption": "Profinet Security",
            "authentication": "Device authentication",
            "vulnerabilities": [
                "CVE-2020-15782"
            ],
            "security_recommendations": "Enable Profinet Security, physical security"
        }
    ]
}

export default assetRegister;