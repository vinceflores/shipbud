"use client";

import { Button } from "../ui/button";

export default function LoginButton({
  label = " Sign in",
}: {
  label?: string;
}) {
  return (
    <Button asChild >
      <a
        href="/auth/login"
        className=""
      >
        {label}
      </a>
    </Button>
  );
}
