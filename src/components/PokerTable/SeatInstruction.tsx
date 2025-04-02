"use client";

interface SeatInstructionProps {
  isUserSeated: boolean;
  isMobile: boolean;
}

export default function SeatInstruction({ isUserSeated, isMobile }: SeatInstructionProps) {
  if (isUserSeated) return null; 

  return (
    <div
      className={`fixed ${isMobile ? "bottom-0 left-0 p-2" : "right-[10%] bottom-[15%] p-2"}`}
    >
      <p className={`text-white ${isMobile ? "text-sm" : "text-[25px]"}`}>
        Суух гэсэн дээр дарж сууна
      </p>
    </div>
  );
}