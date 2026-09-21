const Icon = ({children, size=18, ...props}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
export const DashboardIcon=()=> <Icon><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>;
export const AddIcon=()=> <Icon><path d="M12 5v14M5 12h14"/></Icon>;
export const ClientsIcon=()=> <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
export const EventsIcon=()=> <Icon><path d="M4 4h16v5H4zM4 15h7v5H4zM15 15h5v5h-5zM12 9v3M7.5 12h10"/></Icon>;
export const PlansIcon=()=> <Icon><path d="M20 12v8H4V4h8M15 4h5v5M20 4l-9 9"/></Icon>;
export const BillingIcon=()=> <Icon><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h3"/></Icon>;
export const MasterIcon = () => (
  <Icon>
    <path d="M4 4h6v6H4z" />
    <path d="M14 4h6v6h-6z" />
    <path d="M4 14h6v6H4z" />
    <path d="M14 14h6v6h-6z" />
  </Icon>
);
export const UsageIcon=()=> <Icon><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></Icon>;
export const ChevronIcon=({right=false})=> <Icon size={15}><path d={right?"m9 18 6-6-6-6":"m15 18-6-6 6-6"}/></Icon>;
export const GlobeIcon=()=> <Icon size={16}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></Icon>;
export const LogoutIcon=()=> <Icon size={16}><path d="M10 17l5-5-5-5M15 12H3M15 3h5v18h-5"/></Icon>;
