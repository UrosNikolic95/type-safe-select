import { getAllValuesFrom } from "../src/functions/helpers";
import { F2, Flatten } from "../src/functions/types";

test("Helpers Test 1", async () => {
  const length = 3;
  const obj = {
    A: Array.from({ length }, () => ({
      B: Array.from({ length }, () => ({
        C: Array.from({ length }, () => ({
          D: 1,
        })),
      })),
    })),
  };

  const arr = getAllValuesFrom(obj, (el) => el.A.B.C.D);

  expect(arr.length).toBe(length * length * length);
});

test("Helpers Test 2", async () => {
  const length = 3;
  const obj = {
    A: Array.from({ length }, () =>
      Array.from({ length }, () => ({
        C: Array.from({ length }, () => ({
          D: 1,
        })),
      }))
    ),
  };

  const arr = getAllValuesFrom(obj, (el) => el.A.C.D);

  expect(arr.length).toBe(length * length * length);
});

test("Helpers Test 3", async () => {
  const length = 3;
  const obj = Array.from({ length }, () =>
    Array.from({ length }, () => ({
      C: Array.from({ length }, () => ({
        D: 1,
      })),
    }))
  );

  const arr = getAllValuesFrom(obj, (el) => el.C.D);

  expect(arr.length).toBe(length * length * length);
});

test("Helpers Test 4", async () => {
  const length = 3;
  const obj = Array.from({ length }, () =>
    Array.from({ length }, () =>
      Array.from({ length }, () => ({
        D: 1,
      }))
    )
  );

  const arr = getAllValuesFrom(obj, (el) => el.D);

  expect(arr.length).toBe(length * length * length);
});

test("Helpers Test 5", async () => {
  const obj = {
    A: {
      B: {
        C: {
          D: 1,
        },
      },
    },
  };

  const arr = getAllValuesFrom(obj, (el) => el.A.B.C.D);

  expect(arr.length).toBe(1);
});
