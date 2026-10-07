// Небольшой набор простых, единообразных линейных иконок (в духе
// Feather/Lucide) — вместо разношёрстных цветных эмодзи. Все на базе
// viewBox 24x24, обводка (не заливка), toString через currentColor,
// чтобы наследовать цвет от родителя через CSS.

const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
}

export function InboxIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
        </svg>
    )
}

export function DotIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
    )
}

export function MapPinIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}

export function PieChartIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    )
}

export function TrendingUpIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}

export function BarChartIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <line x1="12" x2="12" y1="20" y2="10" />
            <line x1="18" x2="18" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
    )
}

export function CheckIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

export function AlertIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
    )
}

export function CalendarIcon({ className }) {
    return (
        <svg className={className} {...commonProps}>
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    )
}
