import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(oauth)")({
  component: OAuthLayout,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function OAuthLayout() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-canvas p-3">
      <div className="flex flex-col gap-4 w-full max-w-sm rounded-[2rem] bg-background-elevated p-6">
        <Outlet />
      </div>
    </div>
  );
}
