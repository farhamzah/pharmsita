import React from "react";
import { navigateTo } from "@/router/Router";
import { AuthService } from "../../core/services/auth-service";
import type { Role } from "../../types/roles";

type Props = {
  label?: string;
  to?: string;
  className?: string;
};

const BackToHomeButton: React.FC<Props> = ({
  label = 'Kembali ke Halaman Utama',
  to,
  className = '',
}) => {
  const auth = new AuthService();
  const role = auth.getRole() as Role | null;
  const targetPath = to || role || 'login';

  return (
    <div className="flex justify-center mt-6">
      <button
        onClick={() => navigateTo(targetPath)}
        className={`
          bg-gray-600
          hover:bg-gray-700
          text-white
          px-6
          py-2
          rounded-lg
          transition
          ${className}
        `}
      >
        {label}
      </button>
    </div>
  );
};

export default BackToHomeButton;
