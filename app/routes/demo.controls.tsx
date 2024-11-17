import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { isValidToken } from "~/services/tokens.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token");

  if (!token) {
    throw json({ message: "Token is required" }, { status: 400 });
  }

  if (!isValidToken(token)) {
    throw json({ message: "Invalid token" }, { status: 401 });
  }

  return null;
}

export default function DemoControls() {
  return <Button>DemoMode!</Button>;
}
