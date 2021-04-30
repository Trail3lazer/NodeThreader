addends => {
        const last = addends === null || addends === void 0 ? void 0 : addends.pop();
        return last ? last + 1 : 1;
      }