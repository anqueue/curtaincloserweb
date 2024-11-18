import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Badge } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { authenticator } from "~/services/auth.server";
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

  return { token };
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData();
  const token = body.get("token");
  if (!token) {
    throw json({ message: "Token is required" }, { status: 400 });
  }

  if (!isValidToken(token)) {
    throw json({ message: "Invalid token" }, { status: 401 });
  }

  const action = body.get("action");

  if (action == "open") {
    console.log("OPEN");
    return { action };
  } else if (action == "close") {
    console.log("CLOSE");
    return { action };
  } else {
    throw json({ message: "Invalid action" }, { status: 400 });
  }

  return null;
}

export default function DemoControls() {
  const { token } = useLoaderData<{ token: string }>();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Curtain Closer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Form method="post" action="/demo/controls" navigate={false}>
            <input type="hidden" name="action" value="open" />
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="mb-4 w-full">
              Open
            </Button>
          </Form>
          <Form method="post" action="/demo/controls" navigate={false}>
            <input type="hidden" name="action" value="close" />
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="mb-4 w-full">
              Close
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
