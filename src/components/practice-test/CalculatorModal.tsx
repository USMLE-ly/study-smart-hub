import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalculatorModal({ open, onOpenChange }: CalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState<number>(0);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let result: number;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "×":
          result = currentValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (operation && previousValue !== null) {
      const inputValue = parseFloat(display);
      let result: number;

      switch (operation) {
        case "+":
          result = previousValue + inputValue;
          break;
        case "-":
          result = previousValue - inputValue;
          break;
        case "×":
          result = previousValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? previousValue / inputValue : 0;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const squareRoot = () => {
    const value = parseFloat(display);
    setDisplay(String(Math.sqrt(value)));
  };

  const square = () => {
    const value = parseFloat(display);
    setDisplay(String(value * value));
  };

  const reciprocal = () => {
    const value = parseFloat(display);
    setDisplay(value !== 0 ? String(1 / value) : "Error");
  };

  const memoryClear = () => setMemory(0);
  const memoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForOperand(true);
  };
  const memoryAdd = () => setMemory(memory + parseFloat(display));
  const memorySubtract = () => setMemory(memory - parseFloat(display));

  const ButtonCalc = ({ children, onClick, className, variant = "default" }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    className?: string;
    variant?: "default" | "number" | "operator" | "function";
  }) => (
    <Button
      variant="outline"
      className={cn(
        "h-12 text-lg font-medium",
        variant === "number" && "bg-muted/50 hover:bg-muted",
        variant === "operator" && "bg-primary/10 hover:bg-primary/20 text-primary",
        variant === "function" && "bg-secondary/50 hover:bg-secondary text-secondary-foreground",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Display */}
          <div className="bg-muted p-4 rounded-lg text-right">
            <div className="text-3xl font-mono text-foreground truncate">
              {display}
            </div>
            {operation && previousValue !== null && (
              <div className="text-sm text-muted-foreground">
                {previousValue} {operation}
              </div>
            )}
          </div>

          {/* Memory buttons */}
          <div className="grid grid-cols-5 gap-1">
            <ButtonCalc onClick={memoryClear} variant="function" className="text-sm h-8">MC</ButtonCalc>
            <ButtonCalc onClick={memoryRecall} variant="function" className="text-sm h-8">MR</ButtonCalc>
            <ButtonCalc onClick={memoryAdd} variant="function" className="text-sm h-8">M+</ButtonCalc>
            <ButtonCalc onClick={memorySubtract} variant="function" className="text-sm h-8">M-</ButtonCalc>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              {memory !== 0 && `M: ${memory}`}
            </div>
          </div>

          {/* Calculator buttons */}
          <div className="grid grid-cols-4 gap-2">
            <ButtonCalc onClick={percentage} variant="function">%</ButtonCalc>
            <ButtonCalc onClick={clearEntry} variant="function">CE</ButtonCalc>
            <ButtonCalc onClick={clear} variant="function">C</ButtonCalc>
            <ButtonCalc onClick={() => setDisplay(display.slice(0, -1) || "0")} variant="function">⌫</ButtonCalc>

            <ButtonCalc onClick={reciprocal} variant="function">1/x</ButtonCalc>
            <ButtonCalc onClick={square} variant="function">x²</ButtonCalc>
            <ButtonCalc onClick={squareRoot} variant="function">√x</ButtonCalc>
            <ButtonCalc onClick={() => performOperation("÷")} variant="operator">÷</ButtonCalc>

            <ButtonCalc onClick={() => inputDigit("7")} variant="number">7</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("8")} variant="number">8</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("9")} variant="number">9</ButtonCalc>
            <ButtonCalc onClick={() => performOperation("×")} variant="operator">×</ButtonCalc>

            <ButtonCalc onClick={() => inputDigit("4")} variant="number">4</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("5")} variant="number">5</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("6")} variant="number">6</ButtonCalc>
            <ButtonCalc onClick={() => performOperation("-")} variant="operator">−</ButtonCalc>

            <ButtonCalc onClick={() => inputDigit("1")} variant="number">1</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("2")} variant="number">2</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("3")} variant="number">3</ButtonCalc>
            <ButtonCalc onClick={() => performOperation("+")} variant="operator">+</ButtonCalc>

            <ButtonCalc onClick={toggleSign} variant="number">±</ButtonCalc>
            <ButtonCalc onClick={() => inputDigit("0")} variant="number">0</ButtonCalc>
            <ButtonCalc onClick={inputDecimal} variant="number">.</ButtonCalc>
            <ButtonCalc onClick={calculate} className="bg-primary hover:bg-primary/90 text-primary-foreground">=</ButtonCalc>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
