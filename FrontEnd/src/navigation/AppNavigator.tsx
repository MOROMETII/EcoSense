import React from 'react';

import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Root navigator: renders the auth flow when the user is not logged in,
// and the main tab navigator once they are authenticated.
const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
};

export default AppNavigator;
