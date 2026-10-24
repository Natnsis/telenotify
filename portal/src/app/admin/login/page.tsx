import { redirect } from 'next/navigation';

// The admin portal uses the normal sign-in, then returns here.
export default function AdminLogin() {
  redirect('/login?next=/admin');
}
