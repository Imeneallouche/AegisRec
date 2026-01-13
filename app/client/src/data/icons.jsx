export const IconEye = () => (
    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.269 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
export const IconPointer = () => (
    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M7 17V7h10" />
    </svg>
);
export const IconStar = () => (
    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M12 17.3l6.18 3.73-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.76L5.82 21z" />
    </svg>
);
export const IconTrend = () => (
    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
        <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M18 6l-6 6-4-4-5 5" />
    </svg>
);

export const IconDashboard = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4V3H3v7zM3 21h4v-7H3v7zM10 21h4V12h-4v9zM17 21h4V7h-4v14z" />
    </svg>
);

export const IconInfo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
    </svg>
);


const Icons = {
    IconEye,
    IconPointer,
    IconStar,
    IconTrend,
    IconDashboard,
    IconInfo,
}

export default Icons
