import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LabValuesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labValues = {
  serum: [
    { name: "Sodium", value: "136-145 mEq/L", si: "136-145 mmol/L" },
    { name: "Potassium", value: "3.5-5.0 mEq/L", si: "3.5-5.0 mmol/L" },
    { name: "Chloride", value: "95-105 mEq/L", si: "95-105 mmol/L" },
    { name: "Bicarbonate", value: "22-28 mEq/L", si: "22-28 mmol/L" },
    { name: "BUN", value: "7-20 mg/dL", si: "2.5-7.1 mmol/L" },
    { name: "Creatinine", value: "0.6-1.2 mg/dL", si: "53-106 µmol/L" },
    { name: "Glucose (fasting)", value: "70-100 mg/dL", si: "3.9-5.6 mmol/L" },
    { name: "Calcium", value: "8.4-10.2 mg/dL", si: "2.1-2.6 mmol/L" },
    { name: "Magnesium", value: "1.5-2.0 mEq/L", si: "0.75-1.0 mmol/L" },
    { name: "Phosphorus", value: "3.0-4.5 mg/dL", si: "1.0-1.5 mmol/L" },
    { name: "Uric acid", value: "3.0-8.2 mg/dL", si: "0.18-0.48 mmol/L" },
  ],
  lipids: [
    { name: "Total cholesterol", value: "<200 mg/dL", si: "<5.2 mmol/L" },
    { name: "LDL cholesterol", value: "<100 mg/dL", si: "<2.6 mmol/L" },
    { name: "HDL cholesterol", value: ">40 mg/dL", si: ">1.0 mmol/L" },
    { name: "Triglycerides", value: "<150 mg/dL", si: "<1.7 mmol/L" },
  ],
  liver: [
    { name: "AST (SGOT)", value: "8-20 U/L", si: "8-20 U/L" },
    { name: "ALT (SGPT)", value: "8-20 U/L", si: "8-20 U/L" },
    { name: "Alkaline phosphatase", value: "20-70 U/L", si: "20-70 U/L" },
    { name: "GGT", value: "9-48 U/L", si: "9-48 U/L" },
    { name: "Total bilirubin", value: "0.1-1.0 mg/dL", si: "2-17 µmol/L" },
    { name: "Direct bilirubin", value: "0.0-0.3 mg/dL", si: "0-5 µmol/L" },
    { name: "Albumin", value: "3.5-5.5 g/dL", si: "35-55 g/L" },
    { name: "Total protein", value: "6.0-7.8 g/dL", si: "60-78 g/L" },
  ],
  hematology: [
    { name: "Hemoglobin (M)", value: "13.5-17.5 g/dL", si: "135-175 g/L" },
    { name: "Hemoglobin (F)", value: "12.0-16.0 g/dL", si: "120-160 g/L" },
    { name: "Hematocrit (M)", value: "41-53%", si: "0.41-0.53" },
    { name: "Hematocrit (F)", value: "36-46%", si: "0.36-0.46" },
    { name: "WBC", value: "4,500-11,000/µL", si: "4.5-11 × 10⁹/L" },
    { name: "Platelets", value: "150-400 × 10³/µL", si: "150-400 × 10⁹/L" },
    { name: "MCV", value: "80-100 fL", si: "80-100 fL" },
    { name: "MCH", value: "25.4-34.6 pg", si: "25.4-34.6 pg" },
    { name: "MCHC", value: "31-36 g/dL", si: "310-360 g/L" },
    { name: "RDW", value: "11.5-14.5%", si: "11.5-14.5%" },
    { name: "Reticulocyte count", value: "0.5-2.5%", si: "0.005-0.025" },
  ],
  coagulation: [
    { name: "PT", value: "11-15 seconds", si: "11-15 seconds" },
    { name: "INR", value: "0.8-1.2", si: "0.8-1.2" },
    { name: "aPTT", value: "25-40 seconds", si: "25-40 seconds" },
    { name: "Bleeding time", value: "2-7 minutes", si: "2-7 minutes" },
    { name: "D-dimer", value: "<250 ng/mL", si: "<0.25 µg/mL" },
    { name: "Fibrinogen", value: "200-400 mg/dL", si: "2-4 g/L" },
  ],
  cardiac: [
    { name: "Troponin I", value: "<0.04 ng/mL", si: "<0.04 µg/L" },
    { name: "Troponin T", value: "<0.01 ng/mL", si: "<0.01 µg/L" },
    { name: "CK-MB", value: "<5% of total CK", si: "<5% of total CK" },
    { name: "BNP", value: "<100 pg/mL", si: "<100 ng/L" },
    { name: "NT-proBNP", value: "<300 pg/mL", si: "<300 ng/L" },
  ],
  thyroid: [
    { name: "TSH", value: "0.5-5.0 µU/mL", si: "0.5-5.0 mU/L" },
    { name: "Free T4", value: "0.7-1.9 ng/dL", si: "9-24 pmol/L" },
    { name: "Free T3", value: "2.3-4.2 pg/mL", si: "3.5-6.5 pmol/L" },
    { name: "Total T4", value: "4.5-12.5 µg/dL", si: "58-161 nmol/L" },
    { name: "Total T3", value: "80-180 ng/dL", si: "1.2-2.8 nmol/L" },
  ],
  abg: [
    { name: "pH", value: "7.35-7.45", si: "7.35-7.45" },
    { name: "PaO₂", value: "80-100 mm Hg", si: "10.6-13.3 kPa" },
    { name: "PaCO₂", value: "35-45 mm Hg", si: "4.7-6.0 kPa" },
    { name: "HCO₃⁻", value: "22-26 mEq/L", si: "22-26 mmol/L" },
    { name: "O₂ saturation", value: "95-100%", si: "0.95-1.00" },
  ],
};

const LabValueTable = ({ data }: { data: typeof labValues.serum }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border">
        <th className="text-left py-2 px-2 font-semibold text-foreground">Test</th>
        <th className="text-left py-2 px-2 font-semibold text-foreground">Reference Range</th>
        <th className="text-left py-2 px-2 font-semibold text-foreground">SI Units</th>
      </tr>
    </thead>
    <tbody>
      {data.map((item, index) => (
        <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
          <td className="py-2 px-2 text-foreground">{item.name}</td>
          <td className="py-2 px-2 text-muted-foreground">{item.value}</td>
          <td className="py-2 px-2 text-muted-foreground">{item.si}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export function LabValuesPanel({ open, onOpenChange }: LabValuesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Lab Values Reference</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="serum" className="mt-4">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="serum" className="text-xs py-1.5">Serum</TabsTrigger>
            <TabsTrigger value="hematology" className="text-xs py-1.5">Blood</TabsTrigger>
            <TabsTrigger value="liver" className="text-xs py-1.5">Liver</TabsTrigger>
            <TabsTrigger value="cardiac" className="text-xs py-1.5">Cardiac</TabsTrigger>
          </TabsList>
          <TabsList className="w-full grid grid-cols-4 h-auto mt-1">
            <TabsTrigger value="lipids" className="text-xs py-1.5">Lipids</TabsTrigger>
            <TabsTrigger value="coagulation" className="text-xs py-1.5">Coag</TabsTrigger>
            <TabsTrigger value="thyroid" className="text-xs py-1.5">Thyroid</TabsTrigger>
            <TabsTrigger value="abg" className="text-xs py-1.5">ABG</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100vh-200px)] mt-4">
            <TabsContent value="serum" className="m-0">
              <LabValueTable data={labValues.serum} />
            </TabsContent>
            <TabsContent value="hematology" className="m-0">
              <LabValueTable data={labValues.hematology} />
            </TabsContent>
            <TabsContent value="liver" className="m-0">
              <LabValueTable data={labValues.liver} />
            </TabsContent>
            <TabsContent value="cardiac" className="m-0">
              <LabValueTable data={labValues.cardiac} />
            </TabsContent>
            <TabsContent value="lipids" className="m-0">
              <LabValueTable data={labValues.lipids} />
            </TabsContent>
            <TabsContent value="coagulation" className="m-0">
              <LabValueTable data={labValues.coagulation} />
            </TabsContent>
            <TabsContent value="thyroid" className="m-0">
              <LabValueTable data={labValues.thyroid} />
            </TabsContent>
            <TabsContent value="abg" className="m-0">
              <LabValueTable data={labValues.abg} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
