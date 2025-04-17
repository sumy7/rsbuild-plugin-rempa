import type { ReactNode } from 'react';
import * as React from 'react';

export interface LayoutProps {
  children: ReactNode;
}
const Layout = ({ children }: LayoutProps) => {
  return (
    <div>
      <div>layout</div>
      {children}
    </div>
  );
};

export default Layout;
