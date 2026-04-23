const assetRegister = {
    "metadata": {
        "site_name": "GRFICS v3 Tennessee Eastman (ICS Research Lab)",
        "location": "MITRE-ATTACK-for-ICS stack (Docker Compose)",
        "industry_sector": "Chemical process simulation — Tennessee Eastman benchmark",
        "ics_architecture": "OpenPLC (Modbus master) to virtual Modbus RIO; SCADA-LTS HMI; DMZ; dual-homed router with Suricata; optional ELK on admin network (separate from process control)",
        "normalization_date": "2026-04-23T10:30:00",
        "standard_version": "1.0",
        "description": "Asset register for the GRFICS v3 environment: TE process simulation, six Modbus TCP remote I/O endpoints (valves, reactor tank, analyzer), OpenPLC, engineering workstation, SCADA-LTS HMI, and dual-homed router with Suricata. Kali, Caldera, and the external detection engine are not GRFICS plant assets; ELK is listed only as the bundled log/observability stack where applicable."
    },
    "assets": [
        {
            "asset_id": "GRF-001",
            "asset_name": "Tennessee Eastman Process Simulation (Web + TE Engine)",
            "asset_type": "Process Simulation Server",
            "manufacturer": "GRFICS / Fortiphyd",
            "model": "grfics-simulation (TE C++ + nginx + Unity WebGL)",
            "serial_number": "TE-SIM-001",
            "asset_tag": "GRF-TE-PROC",
            "description": "Tennessee Eastman C++ process model (TCP 55555), nginx/php 3D plant web UI, PHP bridge to process state; hosts Modbus IP aliases .11–.15 for remote I/O processes",
            "status": "Operational",
            "criticality": "Critical",
            "site": "GRFICS ICS segment",
            "location": "container simulation",
            "zone": "b-ics-net (192.168.95.0/24)",
            "operational_role": "Process Model",
            "security_role": "Server",
            "ip_address": [
                "192.168.95.10"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0a"
            ],
            "hostname": "simulation",
            "firmware_version": "TE sim build (see GRFICSv3)",
            "os_version": "Debian-based Python 3.11-slim (simulation image)",
            "protocols": [
                "HTTP",
                "Modbus TCP (aliases)",
                "TCP JSON (55555 internal)"
            ],
            "communication_ports": [
                80,
                55555
            ],
            "vulnerabilities": [
                "Unauthenticated JSON write path (lab)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICSv3 + docker-compose",
            "notes": "Supervisor runs TE binary and all Modbus device scripts; entrypoint adds routes to DMZ via 192.168.95.200"
        },
        {
            "asset_id": "GRF-002",
            "asset_name": "Modbus RIO — Feed 1 (Valve + Flow)",
            "asset_type": "Actuator / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "feed1.py",
            "serial_number": "MB-RIO-F1",
            "asset_tag": "TE-F1-VAL",
            "description": "Modbus TCP server on 192.168.95.10:502, slave 0x01; HR[1] f1_valve setpoint, IR valve position and f1_flow from TE state",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS ICS segment",
            "location": "co-hosted on simulation",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Field I/O",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.10"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0a"
            ],
            "hostname": "simulation (feed1)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "No authentication on Modbus (lab default)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "Maps f1_valve_pos, f1_flow; read/write via 326339.st and mbconfig 192.168.95.10"
        },
        {
            "asset_id": "GRF-003",
            "asset_name": "Modbus RIO — Feed 2 (Valve + Flow)",
            "asset_type": "Actuator / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "feed2.py",
            "serial_number": "MB-RIO-F2",
            "asset_tag": "TE-F2-VAL",
            "description": "Modbus TCP 192.168.95.11:502; HR[1] f2_valve setpoint, IR f2_valve position and f2_flow",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS ICS segment",
            "location": "simulation IP alias eth0:1",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Field I/O",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.11"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0b"
            ],
            "hostname": "simulation (feed2 alias)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "No authentication on Modbus (lab default)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "OpenPLC polls IR(1,2) and writes HR(1) per mbconfig"
        },
        {
            "asset_id": "GRF-004",
            "asset_name": "Modbus RIO — Purge (Valve + Flow)",
            "asset_type": "Actuator / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "purge.py",
            "serial_number": "MB-RIO-PG",
            "asset_tag": "TE-PURGE-VAL",
            "description": "Modbus TCP 192.168.95.12:502; HR[1] purge_valve setpoint, IR purge_valve position and purge_flow; critical for overpressure",
            "status": "Operational",
            "criticality": "Critical",
            "site": "GRFICS ICS segment",
            "location": "simulation IP alias",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Field I/O",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.12"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0c"
            ],
            "hostname": "simulation (purge alias)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "No authentication on Modbus (lab default)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "Target of attack scenarios (e.g. close purge) in GRFICS OT attack chain design documentation"
        },
        {
            "asset_id": "GRF-005",
            "asset_name": "Modbus RIO — Product (Valve + Flow)",
            "asset_type": "Actuator / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "product.py",
            "serial_number": "MB-RIO-PR",
            "asset_tag": "TE-PROD-VAL",
            "description": "Modbus TCP 192.168.95.13:502; HR[1] product_valve setpoint, IR product valve and product_flow; ties to level control",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS ICS segment",
            "location": "simulation IP alias",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Field I/O",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.13"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0d"
            ],
            "hostname": "simulation (product alias)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "No authentication on Modbus (lab default)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "product_valve / product_flow in 326339.st"
        },
        {
            "asset_id": "GRF-006",
            "asset_name": "Modbus RIO — Reactor / Tank (Pressure + Level)",
            "asset_type": "Sensor / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "tank.py",
            "serial_number": "MB-RIO-TK",
            "asset_tag": "TE-REACTOR",
            "description": "Read-only Modbus TCP 192.168.95.14:502; IR[1] pressure (kPa scaled), IR[2] liquid_level (%)",
            "status": "Operational",
            "criticality": "Critical",
            "site": "GRFICS ICS segment",
            "location": "simulation IP alias",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Sensing / Safety indicator",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.14"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0e"
            ],
            "hostname": "simulation (tank alias)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "Spoofing scenario in HMI attack chain (lab)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "TE_process + tank.py mapping",
            "notes": "mbconfig: Tank 192.168.95.14 IR(1,2) HR(1,1) — read-only I/O in practice"
        },
        {
            "asset_id": "GRF-007",
            "asset_name": "Modbus RIO — Analyzer (A/B/C in Purge)",
            "asset_type": "Analyzer / Remote I/O",
            "manufacturer": "pymodbus (GRFICS bridge)",
            "model": "analyzer.py",
            "serial_number": "MB-RIO-AN",
            "asset_tag": "TE-ANALYZER",
            "description": "Read-only Modbus TCP 192.168.95.15:502; IR[1-3] A_in_purge, B_in_purge, C_in_purge (mol fraction scaled)",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS ICS segment",
            "location": "simulation IP alias",
            "zone": "b-ics-net (Level 0 I/O)",
            "operational_role": "Process analytics",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.15"
            ],
            "mac_address": [
                "02:42:ac:1f:95:0f"
            ],
            "hostname": "simulation (analyzer alias)",
            "firmware_version": "pymodbus 3.9.2",
            "os_version": "Container runtime",
            "protocols": [
                "Modbus TCP"
            ],
            "communication_ports": [
                502
            ],
            "vulnerabilities": [
                "No authentication on Modbus (lab default)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "OpenPLC: Analyzer 192.168.95.15 IR(1,3) in mbconfig"
        },
        {
            "asset_id": "GRF-008",
            "asset_name": "OpenPLC (GRFICS PLC)",
            "asset_type": "PLC / Soft PLC",
            "manufacturer": "openplcproject / OpenPLC",
            "model": "fortiphyd/grfics-plc (Debian, MatIEC, libmodbus)",
            "serial_number": "OPC-GRF-001",
            "asset_tag": "GRF-PLC-01",
            "description": "OpenPLC with 326339.st; Modbus master to six RIO; Modbus/TCP server for HMI; DNP3 optional; web UI 8080",
            "status": "Operational",
            "criticality": "Critical",
            "site": "GRFICS ICS segment",
            "location": "container plc",
            "zone": "b-ics-net (Level 1 control)",
            "operational_role": "Controller",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.2"
            ],
            "mac_address": [
                "02:42:ac:1f:95:02"
            ],
            "hostname": "plc",
            "firmware_version": "OpenPLC runtime (mbconfig 100ms poll)",
            "os_version": "Debian bullseye (image)",
            "protocols": [
                "Modbus TCP",
                "HTTP",
                "DNP3"
            ],
            "communication_ports": [
                502,
                8080,
                20000
            ],
            "vulnerabilities": [
                "Default web creds (lab) openplc:openplc"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICSv3 OpenPLC + mbconfig",
            "notes": "HMI and EWS access via route to DMZ at 192.168.95.200"
        },
        {
            "asset_id": "GRF-009",
            "asset_name": "Engineering Workstation (EWS, noVNC XFCE)",
            "asset_type": "Engineering Workstation",
            "manufacturer": "fortiphyd/grfics-workstation",
            "model": "Ubuntu 22.04 + OpenPLC Editor",
            "serial_number": "EWS-GRF-001",
            "asset_tag": "GRF-EWS-01",
            "description": "XFCE desktop, noVNC 6080, OpenPLC Editor; chemical/326339 project; user engineer:plc123 (lab); route to DMZ",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS ICS segment",
            "location": "container ews",
            "zone": "b-ics-net + a-grfics-admin (DMZ route)",
            "operational_role": "Engineering / Programming",
            "security_role": "Endpoint",
            "ip_address": [
                "192.168.95.5"
            ],
            "mac_address": [
                "02:42:ac:1f:95:05"
            ],
            "hostname": "ews",
            "firmware_version": "N/A",
            "os_version": "Ubuntu 22.04",
            "protocols": [
                "VNC / noVNC",
                "HTTP",
                "HTTPS"
            ],
            "communication_ports": [
                6080,
                5900
            ],
            "vulnerabilities": [
                "Default credentials (lab)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICSv3 ews + docs",
            "notes": "Also attached to c-dmz-net in compose (no static DMZ IP); primary ICS 192.168.95.5"
        },
        {
            "asset_id": "GRF-010",
            "asset_name": "SCADA-LTS HMI (Tomcat + MariaDB)",
            "asset_type": "HMI / SCADA",
            "manufacturer": "ScadaLTS (GRFICS image)",
            "model": "fortiphyd/grfics-scadalts 2.7.8.1",
            "serial_number": "HMI-GRF-001",
            "asset_tag": "GRF-HMI-01",
            "description": "SCADA-LTS on Tomcat; MySQL; TenEastView1; Modbus to PLC 192.168.95.2:502; host port 6081->8080",
            "status": "Operational",
            "criticality": "High",
            "site": "GRFICS DMZ",
            "location": "container hmi on c-dmz-net",
            "zone": "c-dmz-net (192.168.90.0/24)",
            "operational_role": "Operator Interface",
            "security_role": "Server",
            "ip_address": [
                "192.168.90.107"
            ],
            "mac_address": [
                "02:42:ac:1f:5a:6b"
            ],
            "hostname": "hmi",
            "firmware_version": "SCADA_LTS 2.7.8.1",
            "os_version": "Eclipse Temurin 11, MariaDB, Tomcat 9.0.109",
            "protocols": [
                "HTTP",
                "Modbus TCP (client to PLC)",
                "JDBC (MySQL)"
            ],
            "communication_ports": [
                8080,
                3306
            ],
            "vulnerabilities": [
                "Default admin:admin (lab doc)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICS envrionment detailed exploration.md",
            "notes": "Route: ip route add 192.168.95.0/24 via 192.168.90.200 to reach PLC"
        },
        {
            "asset_id": "GRF-011",
            "asset_name": "GRFICS Router (iptables + Suricata + fw UI)",
            "asset_type": "Network Router / IPS",
            "manufacturer": "fortiphyd/grfics-router",
            "model": "Debian 12, Flask ulogd, Suricata",
            "serial_number": "RTR-GRF-200",
            "asset_tag": "GRF-RTR-01",
            "description": "Dual-homed: 192.168.95.200 (ICS) and 192.168.90.200 (DMZ); FORWARD default ACCEPT; Modbus/DNP3 parse in Suricata; fw UI 5000",
            "status": "Operational",
            "criticality": "Critical",
            "site": "Perimeter",
            "location": "container router",
            "zone": "b-ics-net and c-dmz-net",
            "operational_role": "Routing / Segmentation / IDS",
            "security_role": "Network Device",
            "ip_address": [
                "192.168.95.200",
                "192.168.90.200"
            ],
            "mac_address": [
                "02:42:ac:1f:95:c8",
                "02:42:ac:1f:5a:c8"
            ],
            "hostname": "router",
            "firmware_version": "Suricata (see suricata.yaml)",
            "os_version": "Debian 12-slim",
            "protocols": [
                "IP forwarding",
                "Modbus (IDS)",
                "DNP3 (IDS)"
            ],
            "communication_ports": [
                5000
            ],
            "vulnerabilities": [
                "Default fw UI creds (lab) admin:password"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "OT Lab",
            "owner": "GRFICS stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "GRFICSv3 router + docs",
            "notes": "Path for ICS↔DMZ: HMI to PLC, simulation/plc/ews to DMZ routes"
        },
        {
            "asset_id": "GRF-012",
            "asset_name": "Elasticsearch (observability cluster)",
            "asset_type": "Search / Time-series index",
            "manufacturer": "Elastic",
            "model": "elasticsearch:8.13.0",
            "serial_number": "ES-GRF-9200",
            "asset_tag": "GRF-ELK-ES",
            "description": "Single-node, xpack security disabled in compose; 9200 exposed; on a-grfics-admin; indexes ics-*, auditd-*, etc.",
            "status": "Operational",
            "criticality": "High",
            "site": "Observability (admin network)",
            "location": "container elasticsearch",
            "zone": "a-grfics-admin (Docker bridge)",
            "operational_role": "Data store",
            "security_role": "Server",
            "ip_address": [
                "172.18.0.10"
            ],
            "mac_address": [
                "02:42:ac:12:00:0a"
            ],
            "hostname": "elasticsearch",
            "firmware_version": "N/A",
            "os_version": "Elastic image (8.13.0)",
            "protocols": [
                "HTTP (REST 9200)"
            ],
            "communication_ports": [
                9200
            ],
            "vulnerabilities": [
                "xpack.security disabled (compose lab)"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "Lab ops",
            "owner": "MITRE stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "docker-compose.yml",
            "notes": "IP is illustrative of Docker bridge assignment; use docker inspect in deployment"
        },
        {
            "asset_id": "GRF-013",
            "asset_name": "Logstash (ingest / MITRE mapping)",
            "asset_type": "Log processor",
            "manufacturer": "Elastic",
            "model": "logstash:8.13.0",
            "serial_number": "LS-GRF-5044",
            "asset_tag": "GRF-ELK-LS",
            "description": "Pipelines, Beats 5044, syslog UDP 5000, JSON 5001, monitoring 9600; mitre_mapping volume",
            "status": "Operational",
            "criticality": "High",
            "site": "Observability (admin network)",
            "location": "container logstash",
            "zone": "a-grfics-admin (Docker bridge)",
            "operational_role": "Ingestion / ETL",
            "security_role": "Server",
            "ip_address": [
                "172.18.0.20"
            ],
            "mac_address": [
                "02:42:ac:12:00:14"
            ],
            "hostname": "logstash",
            "firmware_version": "N/A",
            "os_version": "Elastic image (8.13.0)",
            "protocols": [
                "Beats (5044)",
                "Syslog UDP (5000)",
                "HTTP (9600 API)"
            ],
            "communication_ports": [
                5044,
                5000,
                5001,
                9600
            ],
            "vulnerabilities": [
                "Ensure not exposed past admin net"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "Lab ops",
            "owner": "MITRE stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "docker-compose.yml",
            "notes": "Filebeat ships to logstash; Logstash output to Elasticsearch (docker DNS)"
        },
        {
            "asset_id": "GRF-014",
            "asset_name": "Kibana (dashboards)",
            "asset_type": "Analytics UI",
            "manufacturer": "Elastic",
            "model": "kibana:8.13.0",
            "serial_number": "KIB-GRF-5601",
            "asset_tag": "GRF-ELK-KB",
            "description": "Kibana 5601; ELASTICSEARCH_HOSTS=http://elasticsearch:9200; admin UI for hunt",
            "status": "Operational",
            "criticality": "Medium",
            "site": "Observability (admin network)",
            "location": "container kibana",
            "zone": "a-grfics-admin (Docker bridge)",
            "operational_role": "Visualization",
            "security_role": "Server",
            "ip_address": [
                "172.18.0.30"
            ],
            "mac_address": [
                "02:42:ac:12:00:1e"
            ],
            "hostname": "kibana",
            "firmware_version": "N/A",
            "os_version": "Elastic image (8.13.0)",
            "protocols": [
                "HTTP/HTTPS (5601)"
            ],
            "communication_ports": [
                5601
            ],
            "vulnerabilities": [
                "Access control in lab"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "Lab ops",
            "owner": "MITRE stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "docker-compose.yml",
            "notes": "Host-mapped 5601:5601 for browser access to host"
        },
        {
            "asset_id": "GRF-015",
            "asset_name": "Filebeat (shared_logs shipper)",
            "asset_type": "Log collection agent",
            "manufacturer": "Elastic",
            "model": "filebeat:8.13.0",
            "serial_number": "FB-GRF-001",
            "asset_tag": "GRF-ELK-FB",
            "description": "Ships /shared_logs and assets.json; depends_on logstash; on a-grfics-admin",
            "status": "Operational",
            "criticality": "High",
            "site": "Observability (admin network)",
            "location": "container filebeat",
            "zone": "a-grfics-admin (Docker bridge)",
            "operational_role": "Log shipping",
            "security_role": "Agent",
            "ip_address": [
                "172.18.0.40"
            ],
            "mac_address": [
                "02:42:ac:12:00:28"
            ],
            "hostname": "filebeat",
            "firmware_version": "8.13.0",
            "os_version": "Elastic image",
            "protocols": [
                "Beats to Logstash"
            ],
            "communication_ports": [
                5044
            ],
            "vulnerabilities": [
                "Access to host Docker socket in some configs — verify"
            ],
            "last_patch_date": "N/A (lab build)",
            "next_maintenance": "As image updates",
            "responsible_team": "Lab ops",
            "owner": "MITRE stack",
            "creation_date": "N/A",
            "last_update": "2026-04-23T10:00:00",
            "data_source": "docker-compose.yml (filebeat service)",
            "notes": "Mounts shared_logs, assets.json; strict.perms=false in compose"
        }
    ],
    "network_interfaces": [
        {
            "interface_id": "INT-GRF-001-ETH0",
            "asset_id": "GRF-001",
            "interface_name": "eth0",
            "description": "ICS static on b-ics-net",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:95:0a",
            "ip_address": "192.168.95.10",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "Docker b-ics-net; Modbus RIO + TE + web on same host",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-008-ETH0",
            "asset_id": "GRF-008",
            "interface_name": "eth0",
            "description": "OpenPLC to ICS and routes to DMZ",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:95:02",
            "ip_address": "192.168.95.2",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "HMI via 192.168.95.200 ↔ 192.168.90.200",
            "connection_type": "Router (GRF-011)"
        },
        {
            "interface_id": "INT-GRF-009-ETH0",
            "asset_id": "GRF-009",
            "interface_name": "eth0",
            "description": "EWS on ICS and admin",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:95:05",
            "ip_address": "192.168.95.5",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "ICS bridge + route to 192.168.90.0/24",
            "connection_type": "Switch / Router"
        },
        {
            "interface_id": "INT-GRF-010-ETH0",
            "asset_id": "GRF-010",
            "interface_name": "eth0",
            "description": "HMI in DMZ",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:5a:6b",
            "ip_address": "192.168.90.107",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.90.1",
            "vlan": "c-dmz-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "Router DMZ 192.168.90.200",
            "connection_type": "Router (GRF-011)"
        },
        {
            "interface_id": "INT-GRF-011-ETH0",
            "asset_id": "GRF-011",
            "interface_name": "eth_ics",
            "description": "ICS leg",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:95:c8",
            "ip_address": "192.168.95.200",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "b-ics-net and c-dmz-net interconnection",
            "connection_type": "Router"
        },
        {
            "interface_id": "INT-GRF-011-ETH1",
            "asset_id": "GRF-011",
            "interface_name": "eth_dmz",
            "description": "DMZ leg (Suricata, FORWARD)",
            "type": "Ethernet (bridge)",
            "mac_address": "02:42:ac:1f:5a:c8",
            "ip_address": "192.168.90.200",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.90.1",
            "vlan": "c-dmz-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "HMI and c-dmz-net hosts",
            "connection_type": "Router"
        },
        {
            "interface_id": "INT-GRF-012-ETH0",
            "asset_id": "GRF-012",
            "interface_name": "eth0",
            "description": "Elasticsearch on admin bridge (illustrative IP)",
            "type": "Virtual Ethernet",
            "mac_address": "02:42:ac:12:00:0a",
            "ip_address": "172.18.0.10",
            "subnet_mask": "255.255.0.0",
            "gateway": "172.18.0.1",
            "vlan": "a-grfics-admin",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "a-grfics-admin bridge",
            "connection_type": "Virtual Switch"
        },
        {
            "interface_id": "INT-GRF-013-ETH0",
            "asset_id": "GRF-013",
            "interface_name": "eth0",
            "description": "Logstash on admin bridge",
            "type": "Virtual Ethernet",
            "mac_address": "02:42:ac:12:00:14",
            "ip_address": "172.18.0.20",
            "subnet_mask": "255.255.0.0",
            "gateway": "172.18.0.1",
            "vlan": "a-grfics-admin",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "a-grfics-admin bridge",
            "connection_type": "Virtual Switch"
        },
        {
            "interface_id": "INT-GRF-014-ETH0",
            "asset_id": "GRF-014",
            "interface_name": "eth0",
            "description": "Kibana on admin bridge (illustrative IP)",
            "type": "Virtual Ethernet",
            "mac_address": "02:42:ac:12:00:1e",
            "ip_address": "172.18.0.30",
            "subnet_mask": "255.255.0.0",
            "gateway": "172.18.0.1",
            "vlan": "a-grfics-admin",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "a-grfics-admin bridge",
            "connection_type": "Virtual Switch"
        },
        {
            "interface_id": "INT-GRF-015-ETH0",
            "asset_id": "GRF-015",
            "interface_name": "eth0",
            "description": "Filebeat on admin bridge (illustrative IP)",
            "type": "Virtual Ethernet",
            "mac_address": "02:42:ac:12:00:28",
            "ip_address": "172.18.0.40",
            "subnet_mask": "255.255.0.0",
            "gateway": "172.18.0.1",
            "vlan": "a-grfics-admin",
            "speed": "10 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "a-grfics-admin bridge; reads /shared_logs",
            "connection_type": "Virtual Switch"
        },
        {
            "interface_id": "INT-GRF-003-MB0",
            "asset_id": "GRF-003",
            "interface_name": "eth_alias",
            "description": "Feed 2 Modbus on simulation alias 192.168.95.11",
            "type": "Ethernet (alias on simulation)",
            "mac_address": "02:42:ac:1f:95:0b",
            "ip_address": "192.168.95.11",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "PLC 192.168.95.2 Modbus client",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-004-MB0",
            "asset_id": "GRF-004",
            "interface_name": "eth_alias",
            "description": "Purge Modbus on 192.168.95.12",
            "type": "Ethernet (alias on simulation)",
            "mac_address": "02:42:ac:1f:95:0c",
            "ip_address": "192.168.95.12",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "PLC Modbus master path",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-005-MB0",
            "asset_id": "GRF-005",
            "interface_name": "eth_alias",
            "description": "Product Modbus on 192.168.95.13",
            "type": "Ethernet (alias on simulation)",
            "mac_address": "02:42:ac:1f:95:0d",
            "ip_address": "192.168.95.13",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "PLC 192.168.95.2",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-006-MB0",
            "asset_id": "GRF-006",
            "interface_name": "eth_alias",
            "description": "Tank (pressure, level) on 192.168.95.14",
            "type": "Ethernet (alias on simulation)",
            "mac_address": "02:42:ac:1f:95:0e",
            "ip_address": "192.168.95.14",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "PLC read-only I/O; HMI spoof scenario",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-007-MB0",
            "asset_id": "GRF-007",
            "interface_name": "eth_alias",
            "description": "Analyzer on 192.168.95.15 (IR1–3 composition)",
            "type": "Ethernet (alias on simulation)",
            "mac_address": "02:42:ac:1f:95:0f",
            "ip_address": "192.168.95.15",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "PLC 192.168.95.2",
            "connection_type": "Switch (virtual bridge)"
        },
        {
            "interface_id": "INT-GRF-002-MB0",
            "asset_id": "GRF-002",
            "interface_name": "eth_alias",
            "description": "Feed 1 RIO (same L3 as GRF-001 host) 192.168.95.10:502",
            "type": "Ethernet (co-hosted)",
            "mac_address": "02:42:ac:1f:95:0a",
            "ip_address": "192.168.95.10",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vlan": "b-ics-net",
            "speed": "1 Gbps",
            "duplex": "Full",
            "status": "Up",
            "connected_to": "OpenPLC master poll",
            "connection_type": "Switch (virtual bridge)"
        }
    ],
    "network_ranges": [
        {
            "range_id": "NET-GRF-ICS",
            "network_name": "b-ics-net (GRFICS ICS)",
            "start_ip": "192.168.95.1",
            "end_ip": "192.168.95.254",
            "cidr": "192.168.95.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.95.1",
            "vrf": "N/A (Docker IPAM)",
            "purpose": "Control",
            "zone": "Purdue L0–L2 (TE sim, RIO, PLC, EWS, router leg)",
            "tenant": "GRFICS OT",
            "description": "Static ICS: simulation .10, PLC .2, EWS .5, router .200, Modbus I/O .10–.15 (aliases on simulation)"
        },
        {
            "range_id": "NET-GRF-DMZ",
            "network_name": "c-dmz-net (GRFICS DMZ)",
            "start_ip": "192.168.90.1",
            "end_ip": "192.168.90.254",
            "cidr": "192.168.90.0/24",
            "subnet_mask": "255.255.255.0",
            "gateway": "192.168.90.1",
            "vrf": "N/A (Docker IPAM)",
            "purpose": "DMZ / Lab",
            "zone": "Purdue L3+ (HMI, router leg)",
            "tenant": "GRFICS research",
            "description": "HMI 192.168.90.107, router .200; SCADA to ICS via static route (other lab hosts may share c-dmz-net but are not GRFICS assets here)"
        },
        {
            "range_id": "NET-GRF-ADMIN",
            "network_name": "a-grfics-admin (Docker bridge / ELK)",
            "start_ip": "172.18.0.1",
            "end_ip": "172.18.255.254",
            "cidr": "172.18.0.0/16",
            "subnet_mask": "255.255.0.0",
            "gateway": "172.18.0.1",
            "vrf": "N/A",
            "purpose": "Data Acquisition / Management",
            "zone": "Management / SOAR / Hunt",
            "tenant": "MITRE stack",
            "description": "Elasticsearch, Logstash, Kibana, Filebeat on admin bridge; illustrative 172.18.0.0/16; verify with docker network inspect"
        },
        {
            "range_id": "NET-GRF-SURICATA-HOME-192",
            "network_name": "Suricata HOME_NET (RFC1918 slice)",
            "start_ip": "192.168.0.0",
            "end_ip": "192.168.255.255",
            "cidr": "192.168.0.0/16",
            "subnet_mask": "255.255.0.0",
            "gateway": "N/A",
            "vrf": "N/A",
            "purpose": "IDS visibility",
            "zone": "Router IDS config",
            "tenant": "GRFICS",
            "description": "From suricata.yaml HOME_NET includes 192.168.0.0/16; covers GRFICS subnets"
        },
        {
            "range_id": "NET-GRF-SURICATA-HOME-10",
            "network_name": "Suricata HOME_NET (10/8 slice)",
            "start_ip": "10.0.0.0",
            "end_ip": "10.255.255.255",
            "cidr": "10.0.0.0/8",
            "subnet_mask": "255.0.0.0",
            "gateway": "N/A",
            "vrf": "N/A",
            "purpose": "IDS visibility",
            "zone": "Router IDS config",
            "tenant": "GRFICS",
            "description": "Explicit HOME_NET 10.0.0.0/8 in Suricata profile"
        },
        {
            "range_id": "NET-GRF-SURICATA-HOME-172",
            "network_name": "Suricata HOME_NET (172.12 slice)",
            "start_ip": "172.16.0.0",
            "end_ip": "172.31.255.255",
            "cidr": "172.16.0.0/12",
            "subnet_mask": "255.240.0.0",
            "gateway": "N/A",
            "vrf": "N/A",
            "purpose": "IDS visibility",
            "zone": "Router IDS config",
            "tenant": "GRFICS",
            "description": "Explicit HOME_NET 172.16.0.0/12 in suricata.yaml; includes many Docker default bridges"
        }
    ],
    "connections": [
        {
            "connection_id": "CONN-GRF-001",
            "source_asset_id": "GRF-008",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-002",
            "destination_interface": "Modbus 502 (alias .10 RIO-1)",
            "connection_type": "Network",
            "protocol": "Modbus TCP",
            "port": "502",
            "bandwidth": "1 Gbps",
            "latency": "<10ms",
            "reliability": "High",
            "security_level": "None (lab)"
        },
        {
            "connection_id": "CONN-GRF-002",
            "source_asset_id": "GRF-008",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-006",
            "destination_interface": "Modbus 502 (tank RIO)",
            "connection_type": "Network",
            "protocol": "Modbus TCP",
            "port": "502",
            "bandwidth": "1 Gbps",
            "latency": "<10ms",
            "reliability": "High",
            "security_level": "None (lab)"
        },
        {
            "connection_id": "CONN-GRF-003",
            "source_asset_id": "GRF-010",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-008",
            "destination_interface": "Modbus 502 (PLC slave for HMI)",
            "connection_type": "Network",
            "protocol": "Modbus TCP",
            "port": "502",
            "bandwidth": "1 Gbps",
            "latency": "<20ms (routed)",
            "reliability": "High",
            "security_level": "Router forward (default ACCEPT in lab)"
        },
        {
            "connection_id": "CONN-GRF-004",
            "source_asset_id": "GRF-011",
            "source_interface": "eth_ics",
            "destination_asset_id": "GRF-010",
            "destination_interface": "eth0",
            "connection_type": "Routed / Bridged",
            "protocol": "IP",
            "port": "any",
            "bandwidth": "1 Gbps",
            "latency": "<5ms",
            "reliability": "High",
            "security_level": "iptables (lab)"
        },
        {
            "connection_id": "CONN-GRF-005",
            "source_asset_id": "GRF-009",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-008",
            "destination_interface": "HTTP 8080",
            "connection_type": "Network",
            "protocol": "HTTP",
            "port": "8080",
            "bandwidth": "1 Gbps",
            "latency": "<10ms",
            "reliability": "High",
            "security_level": "Basic auth (OpenPLC default)"
        },
        {
            "connection_id": "CONN-GRF-006",
            "source_asset_id": "GRF-015",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-013",
            "destination_interface": "eth0 (Beats 5044)",
            "connection_type": "Network",
            "protocol": "Beats",
            "port": "5044",
            "bandwidth": "1 Gbps",
            "latency": "<5ms",
            "reliability": "High",
            "security_level": "Admin network only"
        },
        {
            "connection_id": "CONN-GRF-007",
            "source_asset_id": "GRF-013",
            "source_interface": "eth0",
            "destination_asset_id": "GRF-012",
            "destination_interface": "eth0:9200",
            "connection_type": "Network",
            "protocol": "HTTP (Elasticsearch output)",
            "port": "9200",
            "bandwidth": "1 Gbps",
            "latency": "<5ms",
            "reliability": "High",
            "security_level": "xpack off (lab)"
        }
    ],
    "software": [
        {
            "software_id": "SW-GRF-001-01",
            "asset_id": "GRF-001",
            "name": "Tennessee Eastman simulation binary + nginx + PHP",
            "version": "GRFICSv3",
            "vendor": "GRFICS",
            "type": "Process Runtime",
            "patch_level": "As built",
            "end_of_life": "N/A",
            "vulnerabilities": []
        },
        {
            "software_id": "SW-GRF-002-01",
            "asset_id": "GRF-008",
            "name": "OpenPLC (webserver.py, MatIEC, 326339.st)",
            "version": "mbconfig 100ms",
            "vendor": "openplcproject",
            "type": "PLC Runtime",
            "patch_level": "N/A (lab image)",
            "end_of_life": "N/A",
            "vulnerabilities": [
                "Default web credentials (lab doc)"
            ]
        },
        {
            "software_id": "SW-GRF-003-01",
            "asset_id": "GRF-010",
            "name": "SCADA-LTS (Tomcat WAR) + MariaDB",
            "version": "2.7.8.1 / Tomcat 9.0.109",
            "vendor": "ScadaLTS + MariaDB",
            "type": "SCADA/HMI",
            "patch_level": "seed_project_data",
            "end_of_life": "N/A",
            "vulnerabilities": [
                "Default admin:admin (lab doc)"
            ]
        },
        {
            "software_id": "SW-GRF-004-01",
            "asset_id": "GRF-009",
            "name": "OpenPLC Editor (wxPython) + XFCE",
            "version": "GRFICS workstation image",
            "vendor": "openplc + Ubuntu",
            "type": "Engineering IDE",
            "patch_level": "N/A",
            "end_of_life": "N/A",
            "vulnerabilities": []
        },
        {
            "software_id": "SW-GRF-005-01",
            "asset_id": "GRF-011",
            "name": "Suricata + Flask fw UI (iptables, ulogd2)",
            "version": "See grfics-router",
            "vendor": "fortiphyd + OISF + Flask",
            "type": "Network / IDS / Firewall UI",
            "patch_level": "N/A",
            "end_of_life": "N/A",
            "vulnerabilities": [
                "Default UI admin:password (lab doc)"
            ]
        },
        {
            "software_id": "SW-GRF-006-01",
            "asset_id": "GRF-012",
            "name": "Elasticsearch",
            "version": "8.13.0",
            "vendor": "Elastic",
            "type": "Search / index",
            "patch_level": "8.13.0",
            "end_of_life": "Check Elastic policy",
            "vulnerabilities": [
                "xpack.security false in lab compose"
            ]
        }
    ],
    "security_zones": [
        {
            "zone_id": "ZONE-GRF-L0",
            "zone_name": "Level 0 - Tennessee Eastman process I/O",
            "description": "Virtual RIO: Feed 1/2, Purge, Product valves; reactor tank (pressure, level); analyzer composition; TE engine + Modbus",
            "security_requirements": "Lab-only Modbus; know spoofing/override scenarios in docs",
            "network_segment": "b-ics-net (Modbus 192.168.95.10–.15, port 502)",
            "typical_assets": [
                "GRF-001",
                "GRF-002",
                "GRF-003",
                "GRF-004",
                "GRF-005",
                "GRF-006",
                "GRF-007"
            ]
        },
        {
            "zone_id": "ZONE-GRF-L1",
            "zone_name": "Level 1 - OpenPLC (basic control)",
            "description": "OpenPLC 326339.st polling all RIO, exposing slave to HMI; DNP3 config optional",
            "security_requirements": "Protect programming interface; log audit from shared_logs",
            "network_segment": "b-ics-net (192.168.95.2)",
            "typical_assets": [
                "GRF-008"
            ]
        },
        {
            "zone_id": "ZONE-GRF-L2",
            "zone_name": "Level 2 - HMI and engineering (via DMZ / ICS routes)",
            "description": "SCADA-LTS to PLC; EWS to PLC/Editor; no traditional DCS—OpenPLC is supervisory peer",
            "security_requirements": "Strong creds in production; here lab defaults for exercise",
            "network_segment": "c-dmz-net and b-ics-net (routed 192.168.90.200 ↔ 192.168.95.200)",
            "typical_assets": [
                "GRF-009",
                "GRF-010"
            ]
        },
        {
            "zone_id": "ZONE-GRF-L3",
            "zone_name": "Level 3 - Perimeter and observability (ELK on admin bridge)",
            "description": "GRFICS router on ICS/DMZ boundary; ELK stack for log shipping and search (not process control)",
            "security_requirements": "Segmentation from field; keep admin/ELK off process paths where possible",
            "network_segment": "c-dmz-net + a-grfics-admin + b-ics-net (router .200)",
            "typical_assets": [
                "GRF-011",
                "GRF-012",
                "GRF-013",
                "GRF-014",
                "GRF-015"
            ]
        },
        {
            "zone_id": "ZONE-GRF-L4",
            "zone_name": "Level 4 - Not modeled (enterprise / corporate)",
            "description": "No ERP/corporate network in this compose; external links would terminate outside this register",
            "security_requirements": "N/A for this stack",
            "network_segment": "N/A",
            "typical_assets": [
                "N/A in GRFICS compose"
            ]
        },
        {
            "zone_id": "ZONE-GRF-ROUTER",
            "zone_name": "OT perimeter / monitoring",
            "description": "GRFICS router: Suricata Modbus/DNP3 parsers, HOME_NET, FORWARD, ulogd JSON",
            "security_requirements": "IDS tuned for ICS protocols; log analysis in ELK",
            "network_segment": "192.168.95.200 / 192.168.90.200",
            "typical_assets": [
                "GRF-011"
            ]
        }
    ],
    "protocols_used": [
        {
            "protocol_id": "PROT-GRF-001",
            "protocol_name": "Modbus TCP",
            "standard": "Modbus.org / IEC 61131",
            "purpose": "PLC↔RIO, HMI↔PLC; primary field protocol in GRFICS",
            "ports": [
                502
            ],
            "encryption": "None (lab)",
            "authentication": "None (lab)",
            "vulnerabilities": [
                "CVE-2019-16879 (class)",
                "Unauthenticated function codes in lab"
            ],
            "security_recommendations": "Segmentation, allowlists, monitoring (Suricata in router), CIP/Modsec not applicable to pure Modbus"
        },
        {
            "protocol_id": "PROT-GRF-002",
            "protocol_name": "HTTP / HTTPS (OpenPLC, SCADA web)",
            "standard": "IETF RFC 9110+",
            "purpose": "OpenPLC 8080, HMI via Tomcat, TE PHP JSON (simulation 80 internal)",
            "ports": [
                80,
                8080
            ],
            "encryption": "Optional TLS in production",
            "authentication": "Varies: OpenPLC, SCADA (lab creds in docs)",
            "vulnerabilities": [
                "Default credentials on lab UIs (documented)"
            ],
            "security_recommendations": "Disable default creds, TLS, restrict admin"
        },
        {
            "protocol_id": "PROT-GRF-003",
            "protocol_name": "DNP3",
            "standard": "IEEE 1815",
            "purpose": "OpenPLC dnp3.cfg; optional stack alongside Modbus; port 20000 in Suricata",
            "ports": [
                20000
            ],
            "encryption": "As deployed (lab minimal)",
            "authentication": "As deployed",
            "vulnerabilities": [
                "Historically many vendor-specific; verify stack before production"
            ],
            "security_recommendations": "If enabled, secure serial/IP paths and monitoring"
        },
        {
            "protocol_id": "PROT-GRF-004",
            "protocol_name": "Elasticsearch / Beats (HTTP)",
            "standard": "Elastic",
            "purpose": "Ingest and search on ICS logs; Filebeat to Logstash to Elasticsearch",
            "ports": [
                9200,
                5044,
                5000
            ],
            "encryption": "Off in default lab compose; enable in production",
            "authentication": "xpack off in lab",
            "vulnerabilities": [
                "Open cluster if exposed"
            ],
            "security_recommendations": "Keep on admin network only, enable xpack, TLS, RBAC"
        }
    ]
}

export default assetRegister;
