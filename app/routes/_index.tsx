import { Flex, Loader } from "@mantine/core";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
    successRedirect: "/dashboard",
  });
}

export default function Index() {
  return (
    <>
      <Flex align="center" justify="center" style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Flex>
    </>
  );
}
