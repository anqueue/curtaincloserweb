import { LoaderFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard",
  });

  return null;
}

export default function Login() {
  return (
    <Form action="/auth/github" method="post">
      <Button type="submit">Login with GitHub</Button>
    </Form>
  );
}
