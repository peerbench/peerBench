export interface RatingButtonProps {
  rating: number;
  score: number;
  value: number;
  onClick: (rating: number) => void;
  disabled?: boolean;
}

export default function RatingButton({
  rating,
  score,
  value,
  onClick,
  disabled,
}: RatingButtonProps) {
  const isSelected = Math.abs(value - score) < 0.01;
  const isActive = value >= score - 0.05;

  // Calculate color based on currentValue (the selected score) for all active buttons
  const getButtonColor = () => {
    if (isActive) {
      // All buttons from 0 to selected use the same color based on selected value
      if (value <= 0.3) {
        if (isSelected) {
          return "bg-red-600 border-red-600 text-white shadow-lg scale-110";
        }
        return "bg-red-100 border-red-300 text-red-700 hover:bg-red-200";
      }
      if (value <= 0.5) {
        if (isSelected) {
          return "bg-orange-600 border-orange-600 text-white shadow-lg scale-110";
        }
        return "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200";
      }
      if (value <= 0.7) {
        if (isSelected) {
          return "bg-yellow-600 border-yellow-600 text-white shadow-lg scale-110";
        }
        return "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200";
      }
      if (isSelected) {
        return "bg-green-600 border-green-600 text-white shadow-lg scale-110";
      }
      return "bg-green-100 border-green-300 text-green-700 hover:bg-green-200";
    }

    // Inactive state - use gray
    return "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200";
  };

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <button
        onClick={() => onClick(rating)}
        disabled={disabled}
        className={`
        w-10 h-10 rounded-full border-2 font-semibold text-xs transition-all duration-200
        ${getButtonColor()}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
      `}
      >
        {score.toFixed(1)}
      </button>
      {score === 0.0 && (
        <div className="text-xs text-gray-500">
          0.0
          <br />
          Poor
        </div>
      )}
      {score === 0.5 && (
        <div className="text-xs text-gray-500">
          0.5
          <br />
          Fair
        </div>
      )}
      {score === 1.0 && (
        <div className="text-xs text-gray-500">
          1.0
          <br />
          Excellent
        </div>
      )}
    </div>
  );
}
