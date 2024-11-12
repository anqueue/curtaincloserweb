import { Button, Center, Modal } from "@mantine/core";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard",
  });

  return null;
}

export default function Login() {
  return (
    <Center
      style={{
        height: "100vh",
      }}
    >
      <Modal opened={true} onClose={() => {}} centered withCloseButton={false}>
        <Form action="/auth/github" method="post">
          <Button fullWidth type="submit">
            Login with GitHub
          </Button>
        </Form>
      </Modal>
    </Center>
  );
}
