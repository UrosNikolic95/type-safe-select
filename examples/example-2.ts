import { Equals, OperatorData } from "../src/main";

const operatorData1 = Equals(1);

const operatorData2: OperatorData<number> = {
  value: 1,
  stringMaker: (alias, field, varName) => `${alias}.${field} = ${varName}`,
};
