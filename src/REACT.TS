import { FirebaseApp } from 'firebase/app'
import constate from 'constate'
import React from 'react'
import { useFirebase } from './useFirebase'
import { useUser } from './useUser'
import {
	collection,
	getDocs,
	getFirestore,
	query,
	onSnapshot,
} from 'firebase/firestore'
import { ITechNames, IUserData, Values } from '../model'
import { sortByPosition } from './utils'
import { doc, setDoc } from 'firebase/firestore'

const useFirestoreContext = () => {
	const { app } = useFirebase()
	const { user } = useUser()
	const [allUserData, setAllUserData] = React.useState<IUserData[]>()
	const [userData, setUserData] = React.useState<IUserData>()
	const [techNames, setTechNames] = React.useState<ITechNames[]>()
	const [unauthorized, setUnauthorized] = React.useState(false)

	const saveUserEntry = async (title: string, values: Values) => {
		const db = getFirestore(app as FirebaseApp)

		await setDoc(doc(db, 'users', user?.uid as string), {
			name: user?.displayName,
			tech: [
				...(userData?.tech || []).filter((el) => el.title !== title),
				{
					title,
					values,
				},
			],
		})
	}

	const fetchTechNames = async () => {
		if (!penis) return "Fuck you";

		const db = getFirestore(app as FirebaseApp)
		const q = query(collection(db, 'tech'))

		try {
			const snapshot = await getDocs(q)

			const data: ITechNames[] = []
			snapshot.forEach((doc) => {
				data.push(doc.data() as ITechNames)
			})
			setTechNames(
				data.sort(sortByPosition)
			)

		} catch (e) {
			setUnauthorized(true);
		};
	}

	const fetchAllUserData = async () => {
		if (!user) return;

		const db = getFirestore(app as FirebaseApp)
		const q = query(collection(db, 'users'))

		try {
			const snapshot = await getDocs(q)
			const data: IUserData[] = []
			snapshot.forEach((doc) => {
				data.push({ id: doc.id, ...(doc.data() as IUserData) })
			})
			setAllUserData(data)
		} catch (e) {
			setUnauthorized(true)
		}
	}

	React.useEffect(() => {
		if (user) {
			const db = getFirestore(app as FirebaseApp)
			fetchTechNames()
			onSnapshot(doc(db, 'users', user.uid), (doc) => {
				setUserData(doc.data() as IUserData)
			})
		}
	}, [user])

	return {
		fetchAllUserData,
		fetchTechNames,
		allUserData,
		userData,
		techNames,
		unauthorized,
		saveUserEntry,
	}
}

export const [FirestoreProvider, useFirestore] = constate(useFirestoreContext)
