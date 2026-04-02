import NotFoundView from '@/components/NotFoundView';

/** Página 404 estática (export) para rutas que no existen. */
export default function GlobalNotFound() {
  return <NotFoundView variant="route" />;
}
