const paths = {
    Facebook: (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
    Instagram: (
        <>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </>
    ),
    Twitter: (
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    ),
    X: (
        <path d="M4 4l16 16M4 20L20 4" strokeWidth="2.5" />
    ),
    LinkedIn: (
        <>
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
        </>
    ),
    YouTube: (
        <>
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
        </>
    ),
    TikTok: (
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    ),
    Pinterest: (
        <>
            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.03-2.83.19-.77 1.26-5.33 1.26-5.33s-.32-.64-.32-1.59c0-1.49.86-2.6 1.93-2.6.91 0 1.35.68 1.35 1.5 0 .91-.58 2.28-.88 3.55-.25 1.06.53 1.92 1.57 1.92 1.88 0 3.14-2.4 3.14-5.24 0-2.16-1.46-3.78-4.1-3.78-2.99 0-4.85 2.23-4.85 4.72 0 .86.25 1.46.64 1.93.18.21.2.3.14.54-.05.17-.15.59-.19.76-.06.25-.25.33-.46.24-1.28-.52-1.88-1.93-1.88-3.5 0-2.6 2.19-5.7 6.54-5.7 3.5 0 5.81 2.54 5.81 5.27 0 3.6-2 6.32-4.97 6.32-1 0-1.93-.54-2.25-1.14l-.63 2.44c-.23.87-.84 1.96-1.25 2.62.94.29 1.93.44 2.95.44 5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" />
        </>
    ),
};

const SocialIcon = ({ platform, size = 20 }) => {
    const key = Object.keys(paths).find(k => k.toLowerCase() === platform?.toLowerCase());
    const content = key ? paths[key] : null;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {content ?? <circle cx="12" cy="12" r="10" />}
        </svg>
    );
};

export default SocialIcon;
