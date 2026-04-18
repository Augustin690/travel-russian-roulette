import { motion } from 'framer-motion';

interface Props {
  onClick: () => void;
  disabled: boolean;
  spinning: boolean;
  error?: string | null;
}

export default function SpinButton({ onClick, disabled, spinning, error }: Props) {
  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled || spinning}
        whileTap={{ scale: 0.93 }}
        whileHover={disabled ? {} : { scale: 1.02 }}
        animate={
          spinning
            ? { rotate: [0, 360], transition: { duration: 1.2, repeat: Infinity, ease: 'linear' } }
            : { rotate: 0 }
        }
        className={`relative w-48 h-48 rounded-full flex items-center justify-center
          font-black text-cream
          ${
            disabled
              ? 'bg-ink-700 text-cream/40 cursor-not-allowed shadow-none'
              : 'bg-vermilion shadow-spin hover:bg-vermilion-dark'
          }
          transition-colors`}
      >
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-cream/20" />
        <div className="text-center leading-tight">
          <div className="text-3xl tracking-widest">
            {spinning ? '···' : 'SPIN'}
          </div>
          <div className="text-[11px] tracking-[0.4em] mt-1 opacity-80">
            {spinning ? '旋转中' : '开始'}
          </div>
        </div>
      </motion.button>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-xs text-vermilion text-center max-w-[260px]"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
