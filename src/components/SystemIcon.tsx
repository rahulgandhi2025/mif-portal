import {
  Cloud, Database, Server, HardDrive, Globe,
  Router, ShieldAlert, Network, Cable, Building2, Wifi, Radio,
  Cpu, Monitor, SlidersHorizontal,
  Printer, Tablet, Truck,
  User, PackageOpen, PackagePlus, Warehouse, Package,
  TruckIcon, Hand, RefreshCw,
  ScanBarcode, ScanLine, Scan, MoreHorizontal, ScanEye, Bot, Forklift, Undo2,
} from "lucide-react";
import type { IconKey } from "../data/catalog";

const McsLogo = ({ className }: { className?: string }) => (
  <img src="/brand/mcs-logo.png" alt="MCS" className={className} draggable={false} />
);

const MAP: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  cloud:       Cloud,
  database:    Database,
  server:      Server,
  hardDrive:   HardDrive,
  globe:       Globe,
  router:      Router,
  shield:      ShieldAlert,
  network:     Network,
  cable:       Cable,
  building:    Building2,
  wifi:        Wifi,
  radio:       Radio,
  cpu:         Cpu,
  monitor:     Monitor,
  sliders:     SlidersHorizontal,
  printer:     Printer,
  tablet:      Tablet,
  conveyor:    Truck,
  user:        User,
  packageOpen: PackageOpen,
  packagePlus: PackagePlus,
  warehouse:   Warehouse,
  package:     Package,
  truckIn:        TruckIcon,
  truckOut:       Truck,
  handPick:       Hand,
  refreshCw:      RefreshCw,
  rfidTable:      Scan,
  rfidHand:       ScanBarcode,
  rfidTunnel:     ScanLine,
  dotsHorizontal: MoreHorizontal,
  mcsLogo:        McsLogo,
  scanEye:        ScanEye,
  bot:            Bot,
  forklift:       Forklift,
  undo:           Undo2,
};

export function SystemIcon({ icon, className }: { icon: IconKey; className?: string }) {
  const C = MAP[icon] ?? Server;
  return <C className={className} />;
}
