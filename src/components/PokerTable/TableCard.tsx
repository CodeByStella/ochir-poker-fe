import React, { memo } from 'react'
import Card from '../card/Card';
import { ITable } from '@/models/table';

type Props ={
  isMobile:boolean;
  table: ITable;
  getVisibleCardCount: (round: string, totalCards: number) => number
}

const TableCard = memo(({
  getVisibleCardCount,
  isMobile,
  table
}: Props) => {
  if(table.status === "playing"){
  return (
     <div
                className="absolute flex gap-2"
                style={{
                  left: "50%",
                  top: isMobile ? "50%" : "60%",
                  transform: "translate(-50%, 0)",
                  zIndex: 10,
                }}
              >
                {table.communityCards
                  .slice(
                    0,
                    getVisibleCardCount(table.round, table.communityCards.length),
                  )
                  .map((cardValue, index) => (
                    <Card
                      key={`community-static-${index}`}
                      value={cardValue}
                      isOpen={true}
                      style={{
                        position: "relative",
                        width: isMobile ? "35px" : "45px",
                        height: isMobile ? "50px" : "60px",
                      }}
                    />
                  ))}
              </div>
  )
}
return null
})

TableCard.displayName="TableCard"

export default TableCard
