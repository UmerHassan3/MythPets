import Link from "next/link";

type ButtonProps = {
  id: string;
  text: string;
  to: string;
};

/**
 * Server Component — this is a styled link with no interactivity, so marking it
 * `"use client"` would ship JavaScript for every category section on the page
 * and buy nothing.
 */

const Btn = ({ id, text, to }: ButtonProps) => {
  return (
    <Link
      href={`/${to}/${id}`}
      className="
        rounded-md
        bg-red-600
        px-3 py-1.5
        text-sm font-medium text-white
        hover:bg-red-700
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        focus-visible:ring-offset-2
        sm:px-10 sm:py-2
      "
    >
      {text}
    </Link>
  );
};

export default Btn;