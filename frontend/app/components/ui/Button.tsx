interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variants = {
    primary: 'text-white',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border-2'
  };

  const styles: React.CSSProperties = variant === 'primary' 
    ? { backgroundColor: '#1B76FF' }
    : variant === 'outline'
    ? { borderColor: '#1B76FF', color: '#1B76FF' }
    : {};

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      style={styles}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          (e.target as HTMLButtonElement).style.backgroundColor = '#0D5FE0';
        } else if (variant === 'outline') {
          (e.target as HTMLButtonElement).style.backgroundColor = '#E8F2FF';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          (e.target as HTMLButtonElement).style.backgroundColor = '#1B76FF';
        } else if (variant === 'outline') {
          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
