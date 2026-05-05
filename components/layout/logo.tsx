interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
}

export function TramitLogo({ size = 'md', variant = 'full' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: 40, fontSize: 14, subFontSize: 8 },
    md: { width: 140, height: 56, fontSize: 20, subFontSize: 11 },
    lg: { width: 200, height: 80, fontSize: 28, subFontSize: 15 },
  }

  const { width, height, fontSize, subFontSize } = sizes[size]

  if (variant === 'icon') {
    return (
      <svg
        width={height}
        height={height}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Tràmit Economistes"
      >
        <rect width="56" height="56" rx="8" fill="#2272A3" />
        <text
          x="28"
          y="34"
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="1"
        >
          T
        </text>
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tràmit Economistes"
    >
      <rect width={width} height={height} rx="8" fill="#2272A3" />
      <text
        x={width / 2}
        y={height * 0.52}
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        letterSpacing="2"
      >
        TRÀMIT
      </text>
      <text
        x={width / 2}
        y={height * 0.52 + subFontSize + 4}
        textAnchor="middle"
        fill="#E8F4FB"
        fontSize={subFontSize}
        fontWeight="400"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        economistes
      </text>
    </svg>
  )
}
