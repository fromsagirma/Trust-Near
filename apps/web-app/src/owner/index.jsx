import OwnerRoutes from './routes/ownerRoutes';
import { AuthProvider } from './context/AuthContext';

export default function OwnerApp() {
  return (
    <AuthProvider>
      <OwnerRoutes />
    </AuthProvider>
  );
}