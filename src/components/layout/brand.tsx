import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PartSolved home">
      <svg className="brand-gear" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="silver" x2="0.8" y2="1">
            <stop stopColor="#fff" />
            <stop offset=".5" stopColor="#bcc1c6" />
            <stop offset="1" stopColor="#f1f2f3" />
          </linearGradient>
        </defs>
        <path
          fill="url(#silver)"
          d="m33 3 14 0 2 9 7 3 8-5 10 10-5 8 3 7 8 2v14l-9 2-3 7 5 8-10 10-8-5-7 3-2 9H32l-2-9-7-3-8 5L5 66l5-8-3-7-7-2V35l9-2 3-7-5-8 10-10 8 5 7-3z"
          transform="translate(4 0) scale(.9)"
        />
        <circle cx="40" cy="40" r="24" fill="#1b2024" />
        <path
          d="m23 36 13 13 30-29"
          fill="none"
          stroke="#750707"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path
          d="m23 33 13 13 33-29"
          fill="none"
          stroke="#ef171c"
          strokeWidth="9"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-copy">
        <span className="wordmark">
          Part<span>Solved</span>
          <sup>™</sup>
        </span>
        <span className="brand-subtitle">The Part Finder</span>
      </span>
    </Link>
  );
}
