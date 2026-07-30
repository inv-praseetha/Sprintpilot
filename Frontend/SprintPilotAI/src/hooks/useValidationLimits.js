export const useValidationLimits = () => {
  return {
    project: {
      projectId: {
        minLength: 3,
        maxLength: 10
      },
      name: {
        minLength: 3,
        maxLength: 255
      },
      description: {
        minLength: 10,
        maxLength: 100
      },
      teamSize: {
        min: 1,
        max: 9999
      },
      numberOfDays: {
        min: 1,
        max: 9999
      }
    },
    sprint: {
      milestone: {
        maxLength: 150
      }
    },
    general: {
      search: {
        maxLength: 100
      }
    }
  };
};
