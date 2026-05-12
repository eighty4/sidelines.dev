export type ActivityRegistrar = {
    onCronSchedule(cron: string): void
    onNewUser(): void
}

export type Activity = {
    register(registrar: ActivityRegistrar): Promise<void> | void

    // loadData(dataRetrieval: DataRetrieval): Promise<void> | void
}

export type UserPrompt = {
    inputs: Array<UserInput>
    onComplete(): void
}

export type UserInput =
    | {
          kind: 'select'
          label: string
          options: Array<string>
          default?: string
      }
    | {
          kind: 'text'
          label: string
          validation?: RegExp
          default?: string
          placeholder?: string
      }

// export type DataRetrieval = {
//     allRepositories: AllRepositoriesRetrieval
// }

// export type AllRepositoriesRetrieval = {
//     files(): FileRetrieval
// }

// export type FileRetrieval = {
//     glob(glob: string): void
//     path(path: string): void
// }

const blah: Activity = {
    register(registrar) {},

    // loadData(dataRetrieval: DataRetrieval) {
    //     dataRetrieval.allRepositories.files.glob('')
    // },
}

/*

load data
perform background process
user prompt
load data
perform background process
user prompt
perform background process
confirmation

APIs

reporting progress on work
fetching data
prompt a user for more information
continue process

*/
