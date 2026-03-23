"use client";

import { Button } from "../ui/button";

export default function LogoutButton({
  label = "Sign out",
}: {
  label?: string;
}) {
  return (
    <Button asChild variant="outline">
      <a href="/auth/logout" className="" >
        {label}
      </a>
    </Button>
  );
}
