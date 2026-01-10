/**
 * Eibpo Pedigree - Main Index Page
 * 
 * "Doraemon's Pocket" Workspace Concept
 * - Dynamic workspace with rotating cards
 * - Fixed bottom AI search box
 * - Sweep animations on transitions
 */

import React from 'react';
import { WorkspaceLayout } from '@/components/layout';
import { AppProvider } from '@/contexts/AppContext';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <WorkspaceLayout />
    </AppProvider>
  );
};

export default Index;


