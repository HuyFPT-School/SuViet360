import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store';

export default function IndexScreen() {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
