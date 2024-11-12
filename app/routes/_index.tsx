import { Button } from "@mantine/core";
import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Form } from "@remix-run/react";
import dbConnect from "~/services/mongo.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return null;
}

export default function Index() {
  return (
    <div>
      <h1>Welcome to Remix!</h1>
      <Form method="post" action="/auth/github">
        <Button type="submit">Submit</Button>
      </Form>
    </div>
  );
}
