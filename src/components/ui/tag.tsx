interface TagProps {
  children: React.ReactNode;
}

export default function Tag({ children }: TagProps) {
  return (
    <span className="px-2 py-1 text-xs rounded-md primary-gradient-lr text-white">
      {children}
    </span>
  );
}
