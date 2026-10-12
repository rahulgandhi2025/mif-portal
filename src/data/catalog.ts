import type { IsaLevel, SystemCatalogEntry } from "../types";

export type IconKey =
  | "cloud"
  | "database"
  | "server"
  | "hardDrive"
  | "globe"
  | "router"
  | "shield"
  | "network"
  | "cable"
  | "building"
  | "wifi"
  | "radio"
  | "cpu"
  | "monitor"
  | "sliders"
  | "printer"
  | "tablet"
  | "conveyor"
  | "user"
  | "packageOpen"
  | "packagePlus"
  | "warehouse"
  | "package"
  | "truckIn"
  | "truckOut"
  | "handPick"
  | "refreshCw"
  | "rfidTable"
  | "rfidHand"
  | "rfidTunnel"
  | "dotsHorizontal"
  | "mcsLogo"
  | "scanEye"
  | "bot"
  | "forklift"
  | "undo";

export type CatalogEntry = SystemCatalogEntry & { icon: IconKey };

export const SYSTEM_CATALOG: CatalogEntry[] = [
  {key:"WMS",name:"WMS",isaLevel:4,category:"Enterprise",icon:"cloud",description:"Warehouse Management System (cloud).",defaultProtocol:"REST"},
  {key:"ERP",name:"ERP/SAP",isaLevel:5,category:"Enterprise",icon:"database",description:"Enterprise Resource Planning (ERP / SAP).",defaultProtocol:"REST"},
  {key:"SOTI",name:"SOTI",isaLevel:5,category:"MDM",icon:"monitor",description:"Mobile Device Management platform.",defaultProtocol:"REST"},
  {key:"MaerskISP",name:"Maersk ISP",isaLevel:4,category:"Network",icon:"globe",description:"Maersk Internet Service Provider link.",defaultProtocol:"Network"},
  {key:"Server",name:"Server",isaLevel:4,category:"Compute",icon:"server",description:"Application server.",defaultProtocol:"REST"},
  {key:"Database",name:"Database",isaLevel:4,category:"Data",icon:"database",description:"Relational database.",defaultProtocol:"JDBC"},
  {key:"Bartender",name:"Bartender Server",isaLevel:4,category:"Labelling",icon:"printer",description:"Label design / printing server.",defaultProtocol:"REST"},
  {key:"Router",name:"Router",isaLevel:3,category:"Network",icon:"router",description:"Network router.",defaultProtocol:"TCP/IP"},
  {key:"Firewall",name:"Firewall",isaLevel:3,category:"Network",icon:"shield",description:"Perimeter firewall.",defaultProtocol:"TCP/IP"},
  {key:"LAN",name:"LAN Network",isaLevel:3,category:"Network",icon:"network",description:"Local area network segment.",defaultProtocol:"TCP/IP"},
  {key:"Ethernet",name:"Ethernet",isaLevel:3,category:"Network",icon:"cable",description:"Wired Ethernet switch.",defaultProtocol:"TCP/IP"},
  {key:"MCS",name:"Maersk Control System",isaLevel:3,category:"MES",icon:"mcsLogo",description:"Maersk Control System — orchestrates equipment / WCS.",defaultProtocol:"Kafka"},
  {key:"AOTServerRoom",name:"AOT Server Room",isaLevel:3,category:"Compute",icon:"server",description:"AOT on-site server room.",defaultProtocol:"TCP/IP"},
  {key:"AccessPoint",name:"Access Point",isaLevel:3,category:"Network",icon:"wifi",description:"Wi-Fi access point.",defaultProtocol:"TCP/IP"},
  {key:"AccessSwitch",name:"Access Switch",isaLevel:3,category:"Network",icon:"radio",description:"Network access switch.",defaultProtocol:"TCP/IP"},
  {key:"PLC",name:"PLC",isaLevel:2,category:"Control",icon:"cpu",description:"Programmable Logic Controller.",defaultProtocol:"OPC-UA"},
  {key:"HMI",name:"HMI",icon:"monitor",isaLevel:2,category:"Supervision",description:"Human-Machine Interface.",defaultProtocol:"OPC-UA"},
  {key:"Controller",name:"Controller",icon:"sliders",isaLevel:2,category:"Control",description:"Dedicated device controller.",defaultProtocol:"OPC-UA"},
  {key:"Desktop",name:"Desktop",isaLevel:1,category:"Device",icon:"monitor",description:"Operator desktop terminal.",defaultProtocol:"REST"},
  {key:"Printer",name:"Printer",isaLevel:1,category:"Device",icon:"printer",description:"Label / receipt printer.",defaultProtocol:"TCP/IP"},
  {key:"HHD",name:"HHD",isaLevel:1,category:"Device",icon:"tablet",description:"Hand-held device.",defaultProtocol:"REST"},
  {key:"Conveyor",name:"Conveyor",isaLevel:1,category:"Equipment",icon:"conveyor",description:"Motorised conveyor line.",defaultProtocol:"TCP/IP"},
  {key:"Verity",name:"Verity",isaLevel:1,category:"Device",icon:"scanEye",description:"Verity inventory-scanning drone.",defaultProtocol:"REST"},
  {key:"Dexory",name:"Dexory",isaLevel:1,category:"Device",icon:"bot",description:"Dexory inventory-scanning robot.",defaultProtocol:"REST"},
  {key:"MHE",name:"MHE",isaLevel:1,category:"Equipment",icon:"forklift",description:"Material Handling Equipment.",defaultProtocol:"TCP/IP"},
  {key:"RFIDTunnel",name:"RFID Tunnel",isaLevel:1,category:"RFID",icon:"rfidTunnel",description:"RFID tunnel scanner.",defaultProtocol:"REST"},
  {key:"RFIDTableTop",name:"RFID Table Top",isaLevel:1,category:"RFID",icon:"rfidTable",description:"Table-top RFID scanning station.",defaultProtocol:"REST"},
  {key:"RFIDHandheld",name:"RFID Handheld",isaLevel:1,category:"RFID",icon:"rfidHand",description:"Handheld RFID scanner.",defaultProtocol:"REST"},
  {key:"Inbound",name:"Inbound",isaLevel:0,category:"Process",icon:"truckIn",description:"Inbound receiving process.",defaultProtocol:"N/A"},
  {key:"Putaway",name:"Putaway",isaLevel:0,category:"Process",icon:"packagePlus",description:"Put-away process.",defaultProtocol:"N/A"},
  {key:"Picking",name:"Picking",isaLevel:0,category:"Process",icon:"handPick",description:"Order picking process.",defaultProtocol:"N/A"},
  {key:"Replenishment",name:"Replenishment",isaLevel:0,category:"Process",icon:"refreshCw",description:"Stock replenishment process.",defaultProtocol:"N/A"},
  {key:"Packing",name:"Packing",isaLevel:0,category:"Process",icon:"package",description:"Packing process.",defaultProtocol:"N/A"},
  {key:"Dispatch",name:"Dispatch",isaLevel:0,category:"Process",icon:"truckOut",description:"Dispatch / outbound process.",defaultProtocol:"N/A"},
  {key:"Return",name:"Return",isaLevel:0,category:"Process",icon:"undo",description:"Returns handling process.",defaultProtocol:"N/A"},
  {key:"Others",name:"Others",isaLevel:0,category:"Process",icon:"dotsHorizontal",description:"Custom process — rename after adding.",defaultProtocol:"N/A"},
];

export const ISA_LEVELS: { level: IsaLevel; title: string; subtitle: string }[] = [
  { level: 5, title: "Level 5", subtitle: "Enterprise" },
  { level: 4, title: "Level 4", subtitle: "Business & Resource Planning" },
  { level: 3, title: "Level 3", subtitle: "Operation & Execution Systems" },
  { level: 2, title: "Level 2", subtitle: "Monitoring, Supervision & Control" },
  { level: 1, title: "Level 1", subtitle: "Devices, Sensing and Actuation" },
  { level: 0, title: "Level 0", subtitle: "Warehouse Operation Process" },
];

export function catalogByKey(key: string): CatalogEntry | undefined {
  return SYSTEM_CATALOG.find((c) => c.key === key);
}