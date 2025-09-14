import type { FC, SVGAttributes } from 'react'

type SvgProps = SVGAttributes<any>

export const Bookmark: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
    </svg>
)

export const BookmarkAdd: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h240v80H280v518l200-86 200 86v-278h80v400L480-240 200-120Zm80-640h240-240Zm400 160v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
    </svg>
)

export const BookmarkAdded: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h240v80H280v518l200-86 200 86v-278h80v400L480-240 200-120Zm80-640h240-240Zm400 160v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
    </svg>
)

export const BookmarkRemove: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h240v80H280v518l200-86 200 86v-278h80v400L480-240 200-120Zm80-640h240-240Zm400 160v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
    </svg>
)

export const Bookmarks: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h240v80H280v518l200-86 200 86v-278h80v400L480-240 200-120Zm80-640h240-240Zm400 160v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
    </svg>
)

export const Alarm: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-800q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-360Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z" />
    </svg>
)

export const AlarmOff: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="m798-270-60-60q11-27 16.5-52.5T760-436q0-116-82-200t-198-84q-28 0-54 4.5T374-700l-60-60q38-20 79.5-30t86.5-10q74 0 139.5 28T734-694.5Q783-645 811.5-579T840-436q0 45-11 86.5T798-270Zm52-370L680-810l56-56 170 170-56 56ZM820-24 694-150q-45 33-99.5 51.5T480-80q-74 0-139.5-28T226-184q-49-48-77.5-113T120-436q0-62 18.5-116.5T192-652l-34-34-48 48-56-56 48-48-74-74 56-56L876-80l-56 56ZM480-159q42 0 82-13t74-36L248-594q-23 35-35.5 75.5T200-436q0 116 82 196.5T480-159Zm-38-242Zm114-114Z" />
    </svg>
)

export const AlarmAdd: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M440-280h80v-120h120v-80H520v-120h-80v120H320v80h120v120Zm40 200q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-800q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-360ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z" />
    </svg>
)

export const AlarmOn: FC<SvgProps> = props => (
    <svg
        fill="#e3e3e3"
        height="24px"
        width="24px"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
    >
        <path d="M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-800q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-360Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z" />
    </svg>
)
