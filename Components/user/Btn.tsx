"use client";

import Link from "next/link";
import React from "react";

type ButtonProps = {
  id: string;
  text: string;
  to: string;
};

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