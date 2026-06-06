import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

type Props = {
  children?: React.ReactNode;
};

const MainLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-muted">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <Header />
        <div className="py-12 px-4 sm:px-10">{children}</div>
      </div>
    </div>
  );
};

export default MainLayout;
