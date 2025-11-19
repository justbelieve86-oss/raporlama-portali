import React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import UserDashboard from './UserDashboard';

export default function UserPageIsland() {
  return (
    <QueryProvider>
      <UserDashboard />
    </QueryProvider>
  );
}