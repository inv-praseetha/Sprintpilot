export const useValidationLimits = () => {
  return {
    project: {
      projectId: {
        minLength: 3,
        maxLength: 10,
        pattern: '^[A-Z0-9\\-]+$'
      },
      jiraId: {
        maxLength: 10,
        pattern: '^[A-Z][A-Z0-9]+$'
      },
      name: {
        minLength: 3,
        maxLength: 255
      },
      description: {
        minLength: 10,
        maxLength: 5000
      },
      teamSize: {
        min: 1,
        max: 9999
      },
      numberOfDays: {
        min: 1,
        max: 365
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
