import React from 'react';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPencilOutline, IoPersonAddOutline } from 'react-icons/io5';

interface GradientButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  className?: string;
  shortcut?: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  onClick,
  disabled = false,
  title,
  icon,
  gradientFrom,
  gradientTo,
  className = '',
  shortcut
}) => {
  return (
    <li
      style={{ '--gradient-from': gradientFrom, '--gradient-to': gradientTo } as React.CSSProperties}
      className={`relative w-[50px] h-[50px] bg-white shadow-lg rounded-full flex items-center justify-center transition-all duration-500 hover:w-[140px] hover:shadow-none group ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      {/* Gradient background on hover */}
      <span className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 ${!disabled && 'group-hover:opacity-100'}`}></span>
      
      {/* Blur glow */}
      <span className={`absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] opacity-0 -z-10 transition-all duration-500 ${!disabled && 'group-hover:opacity-50'}`}></span>

      {/* Icon */}
      <span className={`relative z-10 transition-all duration-500 ${!disabled && 'group-hover:scale-0'} delay-0`}>
        <span className="text-2xl text-gray-600">{icon}</span>
      </span>

      {/* Title */}
      <span className={`absolute text-white uppercase tracking-wide text-xs font-medium transition-all duration-500 scale-0 ${!disabled && 'group-hover:scale-100'} delay-150 px-2`}>
        {title}
      </span>

      {/* Keyboard shortcut hint */}
      {shortcut && !disabled && (
        <kbd className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {shortcut}
        </kbd>
      )}
    </li>
  );
};

// Approve Button Component
export const ApproveButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  shortcut?: string;
}> = (props) => (
  <GradientButton
    {...props}
    title="Approve"
    icon={<IoCheckmarkCircleOutline />}
    gradientFrom="#10B981"
    gradientTo="#34D399"
  />
);

// Decline Button Component
export const DeclineButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  shortcut?: string;
}> = (props) => (
  <GradientButton
    {...props}
    title="Decline"
    icon={<IoCloseCircleOutline />}
    gradientFrom="#EF4444"
    gradientTo="#F87171"
  />
);

// Edit Button Component
export const EditButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  shortcut?: string;
}> = (props) => (
  <GradientButton
    {...props}
    title="Edit"
    icon={<IoPencilOutline />}
    gradientFrom="#3B82F6"
    gradientTo="#60A5FA"
  />
);

// Assign Button Component
export const AssignButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
}> = ({ title = "Assign", ...props }) => (
  <GradientButton
    {...props}
    title={title}
    icon={<IoPersonAddOutline />}
    gradientFrom="#A855F7"
    gradientTo="#C084FC"
  />
);

// Button Group Container
export const GradientButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <ul className={`flex gap-3 ${className}`}>
      {children}
    </ul>
  );
};

// Export a complete action bar for easy integration
export const ApprovalActionBar: React.FC<{
  onApprove: () => void;
  onDecline: () => void;
  onEdit: () => void;
  onAssign?: () => void;
  disableApprove?: boolean;
  disableAll?: boolean;
  showAssign?: boolean;
  assignTitle?: string;
}> = ({
  onApprove,
  onDecline,
  onEdit,
  onAssign,
  disableApprove = false,
  disableAll = false,
  showAssign = false,
  assignTitle = "Assign"
}) => {
  return (
    <GradientButtonGroup>
      {showAssign && onAssign && (
        <AssignButton
          onClick={onAssign}
          disabled={disableAll}
          title={assignTitle}
        />
      )}
      <EditButton
        onClick={onEdit}
        disabled={disableAll}
        shortcut="E"
      />
      <DeclineButton
        onClick={onDecline}
        disabled={disableAll}
        shortcut="D"
      />
      <ApproveButton
        onClick={onApprove}
        disabled={disableAll || disableApprove}
        shortcut="A"
      />
    </GradientButtonGroup>
  );
};

export default GradientButtonGroup;