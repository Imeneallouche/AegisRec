# Creating test files for the ICS KG builder:
# - ./site.json
# - ./assets.csv  (one PLC entry)
# - ./configs/PLC-ASEM-01_config.json  (PLC configuration)

from pathlib import Path
import json, csv, os

OUT_DIR = Path("YOUR PATH")
CONFIGS_DIR = OUT_DIR / "configs"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CONFIGS_DIR.mkdir(parents=True, exist_ok=True)

# 1) site.json
site = {
    "site_id": "site-alpha-001",
    "name": "Alpha Water Treatment Plant",
    "description": "Pilot water treatment plant with two processing lines and central SCADA.",
    "location": {
        "country": "Algeria",
        "region": "Oran Governorate",
        "site_address": "Zone Industrielle, Oran"
    },
    "contact": {
        "owner": "Alpha Utilities",
        "site_admin": "eng.imene@alphautils.local",
        "phone": "+213-41-000-000"
    },
    "timezone": "Africa/Algiers",
    "created_at": "2025-10-23T10:00:00Z"
}

site_path = OUT_DIR / "site.json"
with site_path.open("w", encoding="utf-8") as f:
    json.dump(site, f, indent=2)

# 2) assets.csv with one PLC entry
assets_csv_path = OUT_DIR / "assets.csv"
headers = ["asset_id","type","manufacturer","model","serial_number","ip_address","mac_address","location","rack_slot","firmware_version","criticality","tags"]
plc_row = {
    "asset_id":"PLC-ASEM-01",
    "type":"PLC",
    "manufacturer":"Siemens",
    "model":"S7-1500 CPU 1516-3 PN/DP",
    "serial_number":"S7-1516-AX-0001",
    "ip_address":"10.10.5.78",
    "mac_address":"00:1A:2B:3C:4D:5E",
    "location":"Pump Room A - Rack 1",
    "rack_slot":"Rack0/Slot2",
    "firmware_version":"FW-2.3.1",
    "criticality":"High",
    "tags":"modbus,water,pump,actuator"
}

with assets_csv_path.open("w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=headers)
    writer.writeheader()
    writer.writerow(plc_row)

# 3) PLC configuration file (JSON)
plc_config = {
    "asset_id": "PLC-ASEM-01",
    "device": {
        "manufacturer": "Siemens",
        "model": "S7-1500 CPU 1516-3 PN/DP",
        "serial_number": "S7-1516-AX-0001",
        "firmware_version": "FW-2.3.1"
    },
    "network": {
        "interfaces": [
            {
                "name": "eth0",
                "ip_address": "10.10.5.78",
                "subnet_mask": "255.255.255.0",
                "gateway": "10.10.5.1",
                "mac": "00:1A:2B:3C:4D:5E",
                "protocols": ["PROFINET", "ModbusTCP"]
            }
        ],
        "ports_open": [502, 102, 5020]
    },
    "io": {
        "modules": [
            {"slot": 1, "type": "DigitalInput", "points": 16},
            {"slot": 2, "type": "DigitalOutput", "points": 16},
            {"slot": 3, "type": "AnalogInput", "points": 4}
        ],
        "tags": [
            {"tag":"PUMP_START","address":"DB1.DBX0.0","data_type":"BOOL","description":"Start command for main pump"},
            {"tag":"PUMP_SPEED","address":"DB1.DBD4","data_type":"REAL","description":"Target RPM for pump"},
            {"tag":"PRESSURE_SENSOR","address":"DB2.DBD0","data_type":"REAL","description":"Pressure reading from sensor PS-1"}
        ]
    },
    "modbus_mapping": {
        "enabled": True,
        "unit_id": 1,
        "registers": [
            {"name":"PUMP_SPEED","register":40001,"type":"HR","length":2},
            {"name":"PRESSURE","register":40003,"type":"HR","length":2}
        ]
    },
    "security": {
        "accounts": [
            {"username":"svc_monitor","role":"monitor","last_password_change":"2025-08-01T12:00:00Z"},
            {"username":"admin","role":"admin","last_password_change":"2024-12-01T09:00:00Z"}
        ],
        "ssh_enabled": False,
        "telnet_enabled": False,
        "remote_management": {
            "allowed_subnets": ["10.10.0.0/16"],
            "jump_host_required": True
        }
    },
    "backup": {
        "last_config_backup":"2025-10-01T02:00:00Z",
        "backup_path":"/backups/plc-ase m-01/config_20251001.zip"
    },
    "notes": "PLC controls the main feed pump on line A. Scheduled maintenance monthly."
}

plc_config_path = CONFIGS_DIR / "PLC-ASEM-01_config.json"
with plc_config_path.open("w", encoding="utf-8") as f:
    json.dump(plc_config, f, indent=2)

# Return created file paths
{
    "site_json": str(site_path),
    "assets_csv": str(assets_csv_path),
    "plc_config": str(plc_config_path)
}

