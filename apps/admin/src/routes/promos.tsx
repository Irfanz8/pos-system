import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/promos')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/promos"!</div>
}
