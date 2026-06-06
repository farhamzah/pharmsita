import React from "react";
import Header from "../components/Header";

type Props = {
  children?: React.ReactNode;
};

const FromLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-muted">
      <div className="flex-1 min-w-0">
        <Header align="center" />
        <div className="py-12 px-4 sm:px-10">{children}</div>
      </div>
    </div>
  );
};

export default FromLayout;
